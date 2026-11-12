'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

import { AppShell } from '@/components/study/AppShell'
import { overallCoverage } from '@/components/study/data'
import type { Subject } from '@/components/study/types'
import type { TutorEvent } from '@/lib/agent/turn'
import { Block } from './Block'

type ThreadSummary = { id: number; preview: string }

type AssistantMessage = {
  id: number
  role: 'assistant'
  blocks: { index: number; text: string }[]
  streaming: boolean
  stopped?: boolean
  unverified?: boolean
}

type ChatMessage =
  | { id: number; role: 'user'; text: string }
  | AssistantMessage

type TutorDeskProps = {
  user: { name: string; email: string; board?: string; classLevel?: number }
  threads: ThreadSummary[]
}

const BOARD_LABELS: Record<string, string> = {
  cbse: 'CBSE',
  icse: 'ICSE / CISCE',
  up: 'UP Board',
}

const SAMPLE_DOUBTS = [
  'Solve the quadratic equation x² − 5x + 6 = 0 and check the roots.',
  'Find the area of a circle with radius 7 cm and show the working.',
  'Explain why dividing by a fraction is the same as multiplying by its reciprocal.',
]

const PREVIEW_LENGTH = 64

function previewOf(text: string) {
  return text.length > PREVIEW_LENGTH ? `${text.slice(0, PREVIEW_LENGTH)}…` : text
}

export function TutorDesk({ user, threads }: TutorDeskProps) {
  const router = useRouter()
  const [summaries, setSummaries] = useState(threads)
  const [activeThreadId, setActiveThreadId] = useState<number | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [statusLabel, setStatusLabel] = useState<string | null>(null)
  const [streamError, setStreamError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [input, setInput] = useState('')
  const [reported, setReported] = useState(false)
  const [coverage, setCoverage] = useState<number | undefined>(undefined)

  const controllerRef = useRef<AbortController | null>(null)
  const lastBlockRef = useRef(-1)
  const lastTextRef = useRef('')
  const idRef = useRef(0)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      try {
        const raw = window.localStorage.getItem('markhall-seat-map-v2')
        if (!raw) return
        const stored = JSON.parse(raw) as { subjects?: Subject[] }
        if (Array.isArray(stored.subjects)) setCoverage(overallCoverage(stored.subjects).percent)
      } catch {
        // The seat map is the study prototype's data; the tutor works without it.
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages, statusLabel, streamError])

  const updateAssistant = useCallback(
    (update: (message: AssistantMessage) => AssistantMessage) => {
      setMessages((prev) => {
        const last = prev[prev.length - 1]
        if (!last || last.role !== 'assistant') return prev
        return [...prev.slice(0, -1), update(last)]
      })
    },
    [],
  )

  const runStream = useCallback(
    async (body: Record<string, unknown>) => {
      const controller = new AbortController()
      controllerRef.current = controller
      lastBlockRef.current = -1
      setSending(true)
      setStreamError(null)

      try {
        const response = await fetch('/api/tutor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        })
        if (!response.ok || !response.body) {
          const data = (await response.json().catch(() => null)) as { error?: string } | null
          throw new Error(data?.error ?? 'The tutor could not start. Try again in a moment.')
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let finished = false

        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          let cut = buffer.indexOf('\n\n')
          while (cut >= 0) {
            const frame = buffer.slice(0, cut)
            buffer = buffer.slice(cut + 2)
            cut = buffer.indexOf('\n\n')

            const dataLine = frame.split('\n').find((line) => line.startsWith('data: '))
            if (!dataLine) continue
            let event: TutorEvent
            try {
              event = JSON.parse(dataLine.slice(6)) as TutorEvent
            } catch {
              continue
            }

            if (event.type === 'meta') {
              setActiveThreadId(event.threadId)
            } else if (event.type === 'status') {
              setStatusLabel(event.label)
            } else if (event.type === 'block') {
              if (event.index <= lastBlockRef.current) continue
              lastBlockRef.current = event.index
              const { index, text } = event
              updateAssistant((message) => ({ ...message, blocks: [...message.blocks, { index, text }] }))
            } else if (event.type === 'done') {
              finished = true
              setActiveThreadId(event.threadId)
              const { content, flagged } = event
              updateAssistant((message) => ({
                ...message,
                streaming: false,
                blocks: [{ index: 0, text: content }],
                unverified: flagged,
              }))
              setSummaries((prev) => {
                const rest = prev.filter((item) => item.id !== event.threadId)
                return [{ id: event.threadId, preview: previewOf(lastTextRef.current) }, ...rest].slice(0, 20)
              })
            } else if (event.type === 'error') {
              finished = true
              setStreamError(event.message)
              updateAssistant((message) => ({ ...message, streaming: false }))
            }
            if (finished) break
          }
          if (finished) break
        }

        if (!finished) {
          throw new Error('The connection dropped before the answer finished. Press retry to continue.')
        }
      } catch (error) {
        if (controller.signal.aborted) {
          updateAssistant((message) => ({ ...message, streaming: false, stopped: true }))
        } else {
          const message = error instanceof Error ? error.message : 'The tutor could not answer right now.'
          setStreamError(message)
          updateAssistant((assistant) => ({ ...assistant, streaming: false }))
        }
      } finally {
        setSending(false)
        setStatusLabel(null)
        controllerRef.current = null
      }
    },
    [updateAssistant],
  )

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || sending) return
    lastTextRef.current = text
    setInput('')
    setStatusLabel('Reading your doubt')
    setMessages((prev) => [
      ...prev,
      { id: idRef.current++, role: 'user', text },
      { id: idRef.current++, role: 'assistant', blocks: [], streaming: true },
    ])
    await runStream({ text, ...(activeThreadId != null ? { threadId: activeThreadId } : {}) })
  }, [activeThreadId, input, runStream, sending])

  const stop = useCallback(() => {
    const controller = controllerRef.current
    controller?.abort()
    if (activeThreadId != null) {
      void fetch('/api/tutor', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId: activeThreadId }),
      }).catch(() => {})
    }
  }, [activeThreadId])

  const retry = useCallback(async () => {
    if (sending) return
    setStatusLabel('Reading your doubt')
    // A partial answer continues from the first unseen block; otherwise rerun.
    const continuing = activeThreadId != null && lastBlockRef.current >= 0
    updateAssistant((message) => ({
      ...message,
      streaming: true,
      stopped: false,
      ...(continuing ? {} : { blocks: [] }),
    }))
    if (activeThreadId == null) {
      await runStream({ text: lastTextRef.current })
    } else if (continuing) {
      await runStream({ threadId: activeThreadId, from: lastBlockRef.current + 1 })
    } else {
      await runStream({ text: lastTextRef.current, threadId: activeThreadId })
    }
  }, [activeThreadId, runStream, sending, updateAssistant])

  const newDoubt = useCallback(() => {
    if (sending) return
    setActiveThreadId(null)
    setMessages([])
    setStreamError(null)
    setStatusLabel(null)
    setReported(false)
  }, [sending])

  const openThread = useCallback(
    async (id: number) => {
      if (sending || id === activeThreadId) return
      setActiveThreadId(id)
      setStreamError(null)
      setStatusLabel(null)
      setReported(false)
      try {
        const response = await fetch(`/api/doubt-threads/${id}`)
        if (!response.ok) throw new Error('not ok')
        const data = (await response.json()) as {
          doc?: { messages?: { role: string; content: string }[]; flagged?: boolean }
          messages?: { role: string; content: string }[]
          flagged?: boolean
        }
        const doc = data.doc ?? data
        setReported(Boolean(doc.flagged))
        setMessages(
          (doc.messages ?? []).map((row, index): ChatMessage =>
            row.role === 'user'
              ? { id: index, role: 'user', text: row.content }
              : {
                  id: index,
                  role: 'assistant',
                  blocks: [{ index: 0, text: row.content }],
                  streaming: false,
                },
          ),
        )
      } catch {
        setStreamError('That thread could not be opened. Try again.')
      }
    },
    [activeThreadId, sending],
  )

  const reportWrong = useCallback(async () => {
    if (activeThreadId == null || reported || sending) return
    setReported(true)
    try {
      const response = await fetch(`/api/doubt-threads/${activeThreadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flagged: true }),
      })
      if (!response.ok) throw new Error('not ok')
    } catch {
      setReported(false)
      setStreamError('The report could not be sent. Try again.')
    }
  }, [activeThreadId, reported, sending])

  const boardLabel = user.board ? (BOARD_LABELS[user.board] ?? 'All boards') : 'All boards'
  const threadFlagged = reported

  return (
    <AppShell
      active="doubts"
      board={boardLabel}
      coveragePercent={coverage}
      grade={user.classLevel != null ? String(user.classLevel) : '—'}
      onDashboard={() => router.push('/dashboard')}
      onDoubts={() => {}}
      onPractice={() => router.push('/dashboard')}
      sessionActive={false}
      user={{ email: user.email, name: user.name }}
    >
      <main className="main-column tutor-column">
        <div className="tutor-head">
          <div>
            <h1>Ask a doubt</h1>
            <p className="tutor-sub">
              Answers are computed step by step. Every number comes from code, not from the prose.
            </p>
          </div>
          <button className="button button-quiet" disabled={sending} onClick={newDoubt} type="button">
            New doubt
          </button>
        </div>

        {summaries.length > 0 && (
          <div className="thread-row" aria-label="Doubt threads">
            {summaries.map((thread) => (
              <button
                aria-pressed={thread.id === activeThreadId}
                className={`thread-tab${thread.id === activeThreadId ? ' is-active' : ''}`}
                disabled={sending}
                key={thread.id}
                onClick={() => openThread(thread.id)}
                type="button"
              >
                {thread.preview}
              </button>
            ))}
          </div>
        )}

        <div className="message-list">
          {messages.length === 0 && (
            <div className="tutor-empty">
              <p className="tutor-empty-line">Every chapter has a seat. Every answer earns its mark.</p>
              <p className="tutor-empty-note">Type a doubt from your syllabus, or start from one of these:</p>
              <div className="tutor-empty-samples">
                {SAMPLE_DOUBTS.map((sample) => (
                  <button className="tutor-sample" key={sample} onClick={() => setInput(sample)} type="button">
                    {sample}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) =>
            message.role === 'user' ? (
              <div className="message-user" key={message.id}>
                <p className="message-label">You</p>
                <p className="user-bubble">{message.text}</p>
              </div>
            ) : (
              <div className="message-assistant" key={message.id}>
                <p className="message-label">Tutor</p>
                <div className="tutor-panel">
                  {message.blocks.map((block) => (
                    <Block key={block.index} text={block.text} />
                  ))}
                </div>
                {!message.streaming && message.blocks.length > 0 && (
                  <div className="tutor-message-foot">
                    {message.unverified && <span className="tutor-chip">Unverified answer</span>}
                    <button
                      className="tutor-report"
                      disabled={threadFlagged}
                      onClick={reportWrong}
                      type="button"
                    >
                      {threadFlagged ? 'Reported for review' : 'Report wrong answer'}
                    </button>
                  </div>
                )}
                {message.stopped && <p className="tutor-note">Stopped. The answer was not saved.</p>}
              </div>
            ),
          )}

          {statusLabel && (
            <p aria-live="polite" className="tutor-status" role="status">
              {statusLabel}…
            </p>
          )}

          {streamError && (
            <div className="inline-error" role="alert">
              <p>{streamError}</p>
              <button className="button button-quiet" disabled={sending} onClick={retry} type="button">
                Retry
              </button>
            </div>
          )}

          <div ref={endRef} />
        </div>

        <form
          className="composer"
          onSubmit={(event) => {
            event.preventDefault()
            void send()
          }}
        >
          <textarea
            aria-label="Your doubt"
            className="input composer-input"
            disabled={sending}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                void send()
              }
            }}
            placeholder="Type your doubt — name the chapter if you can."
            rows={3}
            value={input}
          />
          <div className="composer-actions">
            <button className="button button-quiet" disabled type="button">
              Attach photo
              <span className="nav-soon">Soon</span>
            </button>
            {sending ? (
              <button className="button" onClick={stop} type="button">
                Stop
              </button>
            ) : (
              <button className="button button-primary" disabled={!input.trim()} type="submit">
                Send
              </button>
            )}
          </div>
        </form>
      </main>
    </AppShell>
  )
}
