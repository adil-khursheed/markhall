import { HumanMessage } from '@langchain/core/messages'
import type { Payload } from 'payload'

import type { User } from '@/payload-types'
import { getModel } from '@/lib/ai/models'

import { createBlockAssembler, validateBlock } from './blocks'
import { getCheckpointer } from './checkpointer'
import { buildTutorGraph, messageText, stripFences } from './graph'
import { plainTextFallback } from './placeholders'
import { persistExchange } from './index'
import {
  emptyComputation,
  emptyContext,
  emptyValidation,
  profileOf,
  type ComputedValue,
  type TutorMode,
} from './state'

export type TutorEvent =
  | { type: 'meta'; threadId: number }
  | { type: 'status'; label: string }
  | { type: 'block'; index: number; text: string }
  | { type: 'done'; threadId: number; content: string; mode: TutorMode; flagged: boolean }
  | { type: 'error'; message: string }

export type TurnStatus = 'streaming' | 'done' | 'error'

export type Turn = {
  threadId: number
  status: TurnStatus
  history: TutorEvent[]
  listeners: Set<(event: TutorEvent) => void>
  controller?: AbortController
}

const MAX_TURNS = 200

const STATUS_LABELS: Record<string, string> = {
  read_images: 'Reading your photo',
  guard: 'Reading your doubt',
  route: 'Finding the chapter',
  retrieve: 'Gathering syllabus notes',
  solve: 'Setting up the calculation',
  run_python: 'Checking the mathematics',
  compare_work: 'Checking your steps',
  explain: 'Writing the steps',
  explain_unverified: 'Writing the steps',
  validate_format: 'Checking the answer',
  repair_format: 'Checking the answer',
}

type FinalState = {
  draft?: string
  mode?: TutorMode
  flagged?: boolean
  validation?: { ok: boolean; errors: string[]; attempts: number }
}

const turns = new Map<string, Turn>()

export function getTurn(threadId: number | string): Turn | undefined {
  return turns.get(String(threadId))
}

// The graph validates the whole answer before it is stored, so the final
// content is the checkpointed draft; streaming blocks are its preview.
export function doneContent(finalState: FinalState | undefined, blocks: string[]): string | undefined {
  const draft = finalState?.draft?.trim()
  if (draft) return draft
  return blocks.length ? blocks.join('\n\n') : undefined
}

/** Events a reconnecting client has not seen yet: never stale statuses. */
export function replayEvents(history: TutorEvent[], fromBlock: number): TutorEvent[] {
  return history.filter(
    (event) =>
      event.type === 'block' ? event.index >= fromBlock : event.type === 'done' || event.type === 'error',
  )
}

/** Replays unseen events, then forwards live ones. Returns the unsubscribe. */
export function subscribeTurn(
  turn: Turn,
  fromBlock: number,
  onEvent: (event: TutorEvent) => void,
): () => void {
  turn.listeners.add(onEvent)
  for (const event of replayEvents(turn.history, fromBlock)) onEvent(event)
  return () => {
    turn.listeners.delete(onEvent)
  }
}

export function startTurn(input: {
  payload: Payload
  user: User
  threadId: number
  text: string
  subjectId?: number
  chapterId?: number
  uploads?: number[]
}): Turn {
  const key = String(input.threadId)
  if (turns.get(key)?.status === 'streaming') {
    throw new Error('This doubt is already being answered.')
  }
  turns.delete(key)
  const turn: Turn = { threadId: input.threadId, status: 'streaming', history: [], listeners: new Set() }
  const controller = new AbortController()
  turn.controller = controller
  turns.set(key, turn)
  if (turns.size > MAX_TURNS) {
    const oldest = turns.keys().next()
    if (!oldest.done) turns.delete(oldest.value)
  }
  void drive(turn, input, controller.signal)
  return turn
}

/** The student stopped watching: cancel the run so nothing is stored. */
export function cancelTurn(threadId: number | string) {
  turns.get(String(threadId))?.controller?.abort()
}

async function repairBlock(
  block: string,
  errors: string[],
  values: Record<string, ComputedValue>,
): Promise<string> {
  try {
    const message = await getModel('router').invoke([
      {
        role: 'system',
        content:
          'Repair one Markhall tutor answer block. Fix only the reported formatting problems. Keep every <<v:key>> placeholder exactly as written and do not add new ones. Return only the corrected block with valid KaTeX in $...$ or $$...$$.',
      },
      {
        role: 'human',
        content: `Errors:\n${errors.map((error) => `- ${error}`).join('\n')}\n\nBlock:\n${block}`,
      },
    ])
    const check = validateBlock(stripFences(messageText(message.content)), values)
    if (!check.errors.length) return check.text
  } catch {
    // Repair is best-effort; fall through to plain text below.
  }
  return plainTextFallback(validateBlock(block, values).text)
}

async function drive(
  turn: Turn,
  input: { payload: Payload; user: User; threadId: number; text: string; subjectId?: number; chapterId?: number; uploads?: number[] },
  signal: AbortSignal,
) {
  const { payload, user } = input
  const emit = (event: TutorEvent) => {
    turn.history.push(event)
    for (const listener of turn.listeners) listener(event)
  }

  try {
    const graph = buildTutorGraph({ payload, user, checkpointer: await getCheckpointer() })
    const stream = graph.streamEvents(
      {
        messages: [new HumanMessage(input.text)],
        student: profileOf(user),
        mode: 'doubt' as const,
        request: {
          text: input.text,
          subjectId: input.subjectId,
          chapterId: input.chapterId,
          uploads: input.uploads,
        },
        context: emptyContext(),
        computation: emptyComputation(),
        draft: '',
        validation: emptyValidation(),
        flagged: false,
        images: [],
        compare: undefined,
      },
      { version: 'v2' as const, configurable: { thread_id: String(turn.threadId) }, signal },
    )

    const assembler = createBlockAssembler()
    const blocks: string[] = []
    let values: Record<string, ComputedValue> = {}
    let finalState: FinalState | undefined
    let lastNode = ''
    let index = 0

    const emitBlock = async (raw: string) => {
      const check = validateBlock(raw, values)
      let text = check.text
      if (check.errors.length) text = await repairBlock(raw, check.errors, values)
      if (!text.trim()) return
      blocks.push(text)
      emit({ type: 'block', index: index++, text })
    }

    for await (const event of stream) {
      const node = (event.metadata?.langgraph_node as string | undefined) ?? ''
      if (event.event === 'on_chain_start') {
        if (node && node !== lastNode) {
          lastNode = node
          const label = STATUS_LABELS[node]
          if (label) emit({ type: 'status', label })
        }
      } else if (event.event === 'on_chat_model_stream') {
        if (node === 'explain' || node === 'explain_unverified') {
          const delta = messageText((event.data?.chunk as { content?: unknown } | undefined)?.content)
          if (delta) for (const block of assembler.feed(delta)) await emitBlock(block)
        }
      } else if (event.event === 'on_chain_end') {
        if (node === 'run_python') {
          const computation = (event.data?.output as { computation?: { values?: typeof values } } | undefined)
            ?.computation
          if (computation?.values) values = computation.values
        } else if (!node) {
          const output = event.data?.output as FinalState | undefined
          if (output && typeof output.draft === 'string') finalState = output
        }
      }
    }

    for (const block of assembler.flush()) await emitBlock(block)

    const content = doneContent(finalState, blocks)
    if (!content) throw new Error('The answer could not be formatted. Please try again.')

    const flagged = Boolean(finalState?.flagged)
    await persistExchange({
      payload,
      user,
      threadId: turn.threadId,
      text: input.text,
      content,
      flagged,
      chapterId: input.chapterId,
    })

    turn.status = 'done'
    emit({ type: 'done', threadId: turn.threadId, content, mode: finalState?.mode ?? 'doubt', flagged })
  } catch (error) {
    turn.status = 'error'
    emit({
      type: 'error',
      message: signal.aborted
        ? 'The answer was stopped.'
        : error instanceof Error
          ? error.message
          : 'The tutor could not answer right now. Please try again.',
    })
  }
}
