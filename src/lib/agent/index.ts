import { HumanMessage } from '@langchain/core/messages'
import type { Payload } from 'payload'

import type { User } from '@/payload-types'
import { getCheckpointer } from './checkpointer'
import { buildTutorGraph } from './graph'
import {
  emptyComputation,
  emptyContext,
  emptyValidation,
  profileOf,
  type Computation,
  type TutorMode,
  type Validation,
} from './state'

export type TutorResult = {
  content: string
  mode: TutorMode
  validation: Validation
  computation: Computation
  flagged: boolean
}

export async function runTutor(input: {
  payload: Payload
  user: User
  threadId: number | string
  text: string
  subjectId?: number
  chapterId?: number
}): Promise<TutorResult> {
  const { payload, user, threadId, text } = input

  const thread = await payload.findByID({
    collection: 'doubt-threads',
    id: threadId,
    depth: 0,
    user,
    overrideAccess: false,
  })

  const graph = buildTutorGraph({ payload, user, checkpointer: await getCheckpointer() })
  const state = await graph.invoke(
    {
      messages: [new HumanMessage(text)],
      student: profileOf(user),
      mode: 'doubt',
      request: { text, subjectId: input.subjectId, chapterId: input.chapterId },
      context: emptyContext(),
      computation: emptyComputation(),
      draft: '',
      validation: emptyValidation(),
      flagged: false,
    },
    { configurable: { thread_id: String(threadId) } },
  )

  const content = state.draft ?? ''
  const terminalWithoutDraftValidation =
    state.mode === 'clarify' || state.mode === 'refuse'
  const persist = Boolean(content) && (Boolean(state.validation?.ok) || terminalWithoutDraftValidation)

  if (persist) {
    const at = new Date().toISOString()
    const messages = (thread.messages ?? []).map((message) => ({
      role: message.role,
      content: message.content,
      at: message.at,
    }))

    await payload.update({
      collection: 'doubt-threads',
      id: threadId,
      depth: 0,
      user,
      overrideAccess: false,
      data: {
        messages: [
          ...messages,
          { role: 'user', content: text, at },
          { role: 'assistant', content, at },
        ],
        flagged: Boolean(state.flagged) || Boolean(thread.flagged),
        ...(state.request?.chapterId ? { chapter: state.request.chapterId } : {}),
      },
    })
  }

  return {
    content,
    mode: state.mode ?? 'doubt',
    validation: state.validation ?? emptyValidation(),
    computation: state.computation ?? emptyComputation(),
    flagged: Boolean(state.flagged),
  }
}

export async function reportWrongAnswer(input: {
  payload: Payload
  user: User
  threadId: number | string
}) {
  await input.payload.update({
    collection: 'doubt-threads',
    id: input.threadId,
    user: input.user,
    overrideAccess: false,
    data: { flagged: true },
  })
}
