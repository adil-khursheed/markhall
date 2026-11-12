import { getPayload } from 'payload'
import config from '@payload-config'

import { cancelTurn, getTurn, startTurn, subscribeTurn, type TutorEvent, type Turn } from '@/lib/agent/turn'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type TutorRequestBody = {
  threadId?: number | string
  text?: string
  subjectId?: number
  chapterId?: number
  /** Reconnect: the first block index the client has not rendered yet. */
  from?: number
}

const HEARTBEAT_MS = 15_000

export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: request.headers })
  if (!user) return Response.json({ error: 'Sign in to use the tutor.' }, { status: 401 })

  const body = (await request.json().catch(() => null)) as TutorRequestBody | null
  const reconnecting = !body?.text

  // Reconnect: replay unseen blocks from the running or finished turn.
  if (reconnecting) {
    if (body?.threadId == null) {
      return Response.json({ error: 'That doubt thread could not be found.' }, { status: 400 })
    }
    let thread
    try {
      thread = await payload.findByID({
        collection: 'doubt-threads',
        id: body.threadId,
        depth: 0,
        user,
        overrideAccess: false,
      })
    } catch {
      return Response.json({ error: 'That doubt thread could not be found.' }, { status: 404 })
    }
    const turn = getTurn(thread.id)
    if (turn) return streamTurn(request, turn, Math.max(0, Math.floor(body?.from ?? 0)))
    // The turn is gone (restart or eviction): the answer is stored, replay it whole.
    const answer = [...(thread.messages ?? [])].reverse().find((message) => message.role === 'assistant')
    if (!answer) {
      return Response.json({ error: 'This answer is no longer streaming. Send the doubt again.' }, { status: 409 })
    }
    const stored: Turn = {
      threadId: thread.id,
      status: 'done',
      history: [
        { type: 'done', threadId: thread.id, content: answer.content, mode: 'doubt', flagged: Boolean(thread.flagged) },
      ],
      listeners: new Set(),
    }
    return streamTurn(request, stored, 0)
  }

  const text = body?.text?.trim()
  if (!text) return Response.json({ error: 'Write your doubt before sending.' }, { status: 400 })
  if (text.length > 4000) return Response.json({ error: 'Keep the doubt under 4000 characters.' }, { status: 400 })

  let threadId: number
  try {
    if (body?.threadId != null) {
      const thread = await payload.findByID({
        collection: 'doubt-threads',
        id: body.threadId,
        depth: 0,
        user,
        overrideAccess: false,
      })
      threadId = thread.id
      if (getTurn(threadId)?.status === 'streaming') {
        return Response.json({ error: 'The previous answer is still being written.' }, { status: 409 })
      }
    } else {
      const thread = await payload.create({ collection: 'doubt-threads', data: { user: user.id, messages: [] } })
      threadId = thread.id
    }
  } catch {
    return Response.json({ error: 'That doubt thread could not be found.' }, { status: 404 })
  }

  let turn
  try {
    turn = startTurn({ payload, user, threadId, text, subjectId: body?.subjectId, chapterId: body?.chapterId })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'The tutor could not start.' },
      { status: 409 },
    )
  }

  return streamTurn(request, { ...turn, history: [{ type: 'meta', threadId }, ...turn.history] }, 0)
}

export async function DELETE(request: Request) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: request.headers })
  if (!user) return Response.json({ error: 'Sign in to use the tutor.' }, { status: 401 })

  const body = (await request.json().catch(() => null)) as { threadId?: number | string } | null
  if (body?.threadId == null) return Response.json({ error: 'Missing thread.' }, { status: 400 })

  try {
    await payload.findByID({
      collection: 'doubt-threads',
      id: body.threadId,
      depth: 0,
      user,
      overrideAccess: false,
    })
  } catch {
    return Response.json({ error: 'That doubt thread could not be found.' }, { status: 404 })
  }

  cancelTurn(body.threadId)
  return Response.json({ ok: true })
}

function streamTurn(request: Request, turnLike: { threadId: number; status: string; history: TutorEvent[]; listeners: Set<(event: TutorEvent) => void> }, fromBlock: number) {
  const turn = turnLike as Parameters<typeof subscribeTurn>[0]
  const encoder = new TextEncoder()

  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      let open = true
      let unsubscribe: () => void = () => {}
      const close = () => {
        if (!open) return
        open = false
        clearInterval(heartbeat)
        unsubscribe()
        try {
          controller.close()
        } catch {
          // Already closed by the client disconnect.
        }
      }
      const heartbeat = setInterval(() => {
        if (open) controller.enqueue(encoder.encode(': ping\n\n'))
      }, HEARTBEAT_MS)
      request.signal.addEventListener('abort', close)

      const send = (event: TutorEvent) => {
        if (open) controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        if (event.type === 'done' || event.type === 'error') queueMicrotask(close)
      }

      unsubscribe = subscribeTurn(turn, fromBlock, send)
      if (turn.status !== 'streaming') queueMicrotask(close)
    },
  })

  return new Response(body, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
