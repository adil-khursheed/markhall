'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import rehypeKatex from 'rehype-katex'
import remarkMath from 'remark-math'

import { shuffleSeeded } from '@/lib/mock/pattern'

export type MockQuestion = {
  id: number
  stem: string
  type: 'mcq' | 'numeric' | 'short' | 'long'
  marks: number
  options: string[]
}

type TestRunProps = {
  attemptId: number
  testId: number
  title: string
  deadlineAt: string
  questions: MockQuestion[]
  responses: Record<number, string>
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D']

function Markdown({ children }: { children: string }) {
  return (
    <div className="mock-stem">
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
        {children}
      </ReactMarkdown>
    </div>
  )
}

function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function TestRun({ attemptId, testId, title, deadlineAt, questions, responses: initialResponses }: TestRunProps) {
  const router = useRouter()
  const byId = useMemo(() => new Map(questions.map((question) => [question.id, question])), [questions])
  const order = useMemo(() => shuffleSeeded(questions.map((question) => question.id), attemptId), [questions, attemptId])

  const [responses, setResponses] = useState<Record<number, string>>(initialResponses)
  const [photos, setPhotos] = useState<Record<number, number[]>>({})
  const [current, setCurrent] = useState(0)
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, Math.ceil((new Date(deadlineAt).getTime() - Date.now()) / 1000)),
  )
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'retrying'>('idle')
  const [submitting, setSubmitting] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const pending = useRef(new Map<number, string>())
  const submitted = useRef(false)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flush = useCallback(async () => {
    if (!pending.current.size || submitted.current) return
    const batch = [...pending.current]
    pending.current.clear()
    setSaveState('saving')
    try {
      const response = await fetch('/api/mock', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'autosave',
          attemptId,
          responses: batch.map(([questionId, response]) => ({ questionId, response })),
        }),
      })
      if (response.status === 410) {
        // The server closed the attempt at the deadline.
        submitted.current = true
        router.push(`/mock/${testId}`)
        return
      }
      if (!response.ok) throw new Error('autosave failed')
      setSaveState('saved')
    } catch {
      // Keep the writes queued; the interval retries them on a flaky network.
      for (const [questionId, response] of batch) pending.current.set(questionId, response)
      setSaveState('retrying')
    }
  }, [attemptId, router, testId])

  // Retry queued autosaves while the paper is open, and flush on the way out.
  useEffect(() => {
    const timer = setInterval(() => {
      void flush()
    }, 4000)
    return () => {
      clearInterval(timer)
      void flush()
    }
  }, [flush])

  const answer = useCallback(
    (questionId: number, response: string) => {
      setResponses((previous) => ({ ...previous, [questionId]: response }))
      pending.current.set(questionId, response)
      if (debounce.current) clearTimeout(debounce.current)
      debounce.current = setTimeout(() => {
        void flush()
      }, 1200)
    },
    [flush],
  )

  const submit = useCallback(
    async (auto = false) => {
      if (submitted.current) return
      submitted.current = true
      setSubmitting(true)
      void flush()
      try {
        const response = await fetch('/api/mock', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'submit', attemptId }),
        })
        if (!response.ok && response.status !== 409) {
          submitted.current = false
          setSubmitting(false)
          if (!auto) setError('The paper could not be submitted. Try again.')
          return
        }
        router.push(`/mock/${testId}`)
      } catch {
        submitted.current = false
        setSubmitting(false)
        if (!auto) setError('The paper could not be submitted. Try again.')
      }
    },
    [attemptId, flush, router, testId],
  )

  // Server deadline drives the clock; zero submits the paper automatically.
  useEffect(() => {
    const timer = setInterval(() => {
      const left = Math.max(0, Math.ceil((new Date(deadlineAt).getTime() - Date.now()) / 1000))
      setRemaining(left)
      if (left === 0) void submit(true)
    }, 1000)
    return () => clearInterval(timer)
  }, [deadlineAt, submit])

  const uploadPhoto = useCallback(
    async (questionId: number, files: FileList | null) => {
      const file = files?.[0]
      if (!file) return
      setError(null)
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) {
        setError('Attach a JPG, PNG or WebP photo, up to 8 MB.')
        return
      }
      setUploading(true)
      try {
        const form = new FormData()
        form.append('file', file)
        form.append('purpose', 'mock_answer')
        const upload = await fetch('/api/student-uploads', { method: 'POST', body: form })
        const uploadData = (await upload.json().catch(() => null)) as {
          doc?: { id?: number }
          id?: number
        } | null
        const uploadId = uploadData?.doc?.id ?? uploadData?.id
        if (!upload.ok || !uploadId) throw new Error('upload failed')

        const linked = await fetch('/api/mock', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'attach', attemptId, questionId, uploadId }),
        })
        const linkedData = (await linked.json().catch(() => null)) as { images?: number; error?: string } | null
        if (!linked.ok || !linkedData?.images) throw new Error('link failed')
        setPhotos((previous) => ({ ...previous, [questionId]: Array.from({ length: linkedData.images ?? 0 }) }))
      } catch {
        setError('That photo could not be attached. Try a smaller JPG or PNG.')
      } finally {
        setUploading(false)
      }
    },
    [attemptId],
  )

  const questionId = order[current]
  const question = byId.get(questionId)
  const answeredCount = order.filter((id) => (responses[id] ?? '').trim().length > 0).length

  if (!question) return null

  const optionOrder = shuffleSeeded(question.options, attemptId * 7919 + question.id)
  const saveLabel =
    saveState === 'saving'
      ? 'Saving…'
      : saveState === 'retrying'
        ? 'Retrying save…'
        : saveState === 'saved'
          ? 'All answers saved'
          : ''

  return (
    <section className="mock-run" aria-label={`${title} — timed paper`}>
      <header className="mock-run-head">
        <div>
          <h1 className="mock-run-title">{title}</h1>
          <p className="mock-run-meta">
            Question {current + 1} of {order.length} · {answeredCount} answered
            {saveLabel && <span className="mock-save">{saveLabel}</span>}
          </p>
        </div>
        <p
          className={`mock-timer${remaining < 60 ? ' is-low' : ''}`}
          aria-live="polite"
          aria-label={`Time remaining ${formatClock(remaining)}`}
        >
          {formatClock(remaining)}
        </p>
      </header>

      <nav className="mock-palette" aria-label="Question palette">
        {order.map((id, index) => (
          <button
            aria-current={index === current ? 'true' : undefined}
            aria-label={`Go to question ${index + 1}${(responses[id] ?? '').trim() ? ', answered' : ', not answered'}`}
            className={`mock-palette-item${index === current ? ' is-current' : ''}${
              (responses[id] ?? '').trim() ? ' is-answered' : ''
            }`}
            key={id}
            onClick={() => setCurrent(index)}
            type="button"
          >
            {index + 1}
          </button>
        ))}
      </nav>

      <article className="mock-question">
        <p className="mock-question-meta">
          Q{current + 1} · {question.marks} mark{question.marks === 1 ? '' : 's'} ·{' '}
          {question.type === 'mcq'
            ? 'Multiple choice'
            : question.type === 'numeric'
              ? 'Numerical answer'
              : question.type === 'short'
                ? 'Short answer'
                : 'Long answer'}
        </p>
        <Markdown>{question.stem}</Markdown>

        {question.type === 'mcq' ? (
          <div className="mock-options" role="radiogroup" aria-label="Answer options">
            {optionOrder.map((optionText, index) => (
              <button
                aria-checked={responses[question.id] === optionText}
                className={`mock-option${responses[question.id] === optionText ? ' is-picked' : ''}`}
                key={index}
                onClick={() => answer(question.id, optionText)}
                role="radio"
                type="button"
              >
                <span className="mock-option-letter">{OPTION_LETTERS[index] ?? '?'}</span>
                <Markdown>{optionText}</Markdown>
              </button>
            ))}
          </div>
        ) : (
          <>
            <label className="mock-answer-label" htmlFor={`answer-${question.id}`}>
              {question.type === 'numeric' ? 'Your answer (a number)' : 'Your answer'}
            </label>
            <textarea
              className="mock-answer"
              id={`answer-${question.id}`}
              inputMode={question.type === 'numeric' ? 'decimal' : undefined}
              onChange={(event) => answer(question.id, event.target.value)}
              rows={question.type === 'long' ? 10 : 4}
              value={responses[question.id] ?? ''}
            />
            {(question.type === 'short' || question.type === 'long') && (
              <div className="mock-attach">
                <label className="button button-quiet" htmlFor={`photo-${question.id}`}>
                  {uploading ? 'Uploading…' : 'Attach photo of written work'}
                </label>
                <input
                  accept="image/jpeg,image/png,image/webp"
                  id={`photo-${question.id}`}
                  onChange={(event) => {
                    void uploadPhoto(question.id, event.target.files)
                    event.target.value = ''
                  }}
                  type="file"
                />
                {photos[question.id]?.length ? (
                  <span className="mock-attach-note">
                    {photos[question.id].length} photo{photos[question.id].length === 1 ? '' : 's'} attached
                  </span>
                ) : null}
              </div>
            )}
          </>
        )}
      </article>

      {error && (
        <p className="mock-error-text" role="alert">
          {error}
        </p>
      )}

      <footer className="mock-run-foot">
        <button
          className="button"
          disabled={current === 0}
          onClick={() => setCurrent((index) => Math.max(0, index - 1))}
          type="button"
        >
          Previous
        </button>
        <button
          className="button"
          disabled={current >= order.length - 1}
          onClick={() => setCurrent((index) => Math.min(order.length - 1, index + 1))}
          type="button"
        >
          Next
        </button>
        {confirming ? (
          <span className="mock-confirm">
            <span>Submit the paper? You cannot change answers afterwards.</span>
            <button className="button button-primary" disabled={submitting} onClick={() => void submit()} type="button">
              {submitting ? 'Submitting…' : 'Yes, submit'}
            </button>
            <button className="button button-quiet" onClick={() => setConfirming(false)} type="button">
              Keep writing
            </button>
          </span>
        ) : (
          <button className="button button-primary" disabled={submitting} onClick={() => setConfirming(true)} type="button">
            Submit paper
          </button>
        )}
      </footer>
    </section>
  )
}
