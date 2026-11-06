'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowLeft } from './ArrowLeft'
import { examinerNote, markAnswer } from './data'
import type { AnswerRecord, Question, Session } from './types'

type PracticeProps = {
  session: Session
  subjectName: string
  chapterName: string
  questions: Question[]
  onDraftChange: (questionId: string, value: string) => void
  onAnswer: (record: AnswerRecord) => void
  onRetry: (questionId: string) => void
  onNext: () => void
  onFinish: () => void
  onSaveExit: () => void
}

export function Practice({
  session,
  subjectName,
  chapterName,
  questions,
  onDraftChange,
  onAnswer,
  onRetry,
  onNext,
  onFinish,
  onSaveExit,
}: PracticeProps) {
  const question = questions[session.currentIndex]
  const [checkingId, setCheckingId] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [remaining, setRemaining] = useState(() => remainingSeconds(session))
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const draft = question ? session.drafts[question.id] ?? '' : ''
  const checking = checkingId === question?.id
  const error = question ? errors[question.id] ?? null : null

  useEffect(() => {
    const interval = setInterval(() => setRemaining(remainingSeconds(session)), 1000)
    return () => clearInterval(interval)
  }, [session])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  if (!question) {
    return (
      <main className="main-column">
        <p className="rail-empty">This session has no questions. Return to the dashboard and choose another seat.</p>
      </main>
    )
  }

  const answer = session.answers[question.id]
  const isLast = session.currentIndex === questions.length - 1
  const timeUp = remaining <= 0
  const words = draft.trim().split(/\s+/).filter(Boolean).length

  function submit() {
    setErrors((previous) => {
      const next = { ...previous }
      delete next[question.id]
      return next
    })
    if (draft.trim().length < 8) {
      setErrors((previous) => ({
        ...previous,
        [question.id]: 'Write at least one full sentence before asking for a check.',
      }))
      return
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setErrors((previous) => ({
        ...previous,
        [question.id]:
          'The feedback service is unreachable. Your answer is saved here; reconnect and retry the check.',
      }))
      return
    }
    setCheckingId(question.id)
    timerRef.current = setTimeout(() => {
      const awarded = markAnswer(question, draft)
      onAnswer({
        questionId: question.id,
        answer: draft,
        awarded,
        total: question.marks,
        note: examinerNote(question, awarded, draft),
        modelPoints: question.modelPoints,
        checkedAt: new Date().toISOString(),
      })
      setCheckingId(null)
    }, 700)
  }

  function updateDraft(value: string) {
    onDraftChange(question.id, value)
  }

  function retry() {
    setCheckingId(null)
    setErrors((previous) => {
      const next = { ...previous }
      delete next[question.id]
      return next
    })
    onRetry(question.id)
  }

  function next() {
    if (isLast) {
      onFinish()
    } else {
      onNext()
    }
  }

  return (
    <main className="main-column practice-column">
      <div className="practice-head">
        <button className="back-link" onClick={onSaveExit} type="button">
          <ArrowLeft /> Save and exit
        </button>
        <div className="practice-meta">
          <span className="practice-seat">{subjectName}</span>
          <span className="practice-dot" aria-hidden="true" />
          <span>{chapterName}</span>
        </div>
        <p aria-live={timeUp ? 'assertive' : 'off'} className={`timer${timeUp ? ' is-up' : ''}`}>
          <span className="timer-label">{timeUp ? 'Time up' : 'On the clock'}</span>
          <span className="timer-value">{formatTime(remaining)}</span>
        </p>
      </div>

      <div className="progress-row" aria-label={`Question ${session.currentIndex + 1} of ${questions.length}`}>
        {questions.map((item, index) => {
          const answered = Boolean(session.answers[item.id])
          return (
            <span
              className={`progress-pip${answered ? ' is-answered' : ''}${index === session.currentIndex ? ' is-current' : ''}`}
              key={item.id}
            >
              {String(index + 1).padStart(2, '0')}
            </span>
          )
        })}
        <span className="progress-copy">
          Question {session.currentIndex + 1} of {questions.length}
        </span>
      </div>

      <article className="question-card">
        <header className="question-head">
          <span className="question-mark">[{question.marks} marks]</span>
          <span className="sample-tag">Sample question</span>
        </header>
        <h1 className="question-prompt">{question.prompt}</h1>

        <label className="field answer-field">
          <span className="field-label">Your answer</span>
          <textarea
            className="input answer-input"
            onChange={(event) => updateDraft(event.target.value)}
            placeholder="Write the answer the way you would in the exam booklet."
            rows={8}
            value={draft}
          />
        </label>
        <div className="answer-foot">
          <span>{words} words</span>
          <span>{question.marks} marks available</span>
        </div>

        {error && (
          <div className="inline-error" role="alert">
            <p>{error}</p>
            <button className="button button-quiet" onClick={submit} type="button">
              Retry check
            </button>
          </div>
        )}

        {timeUp && !answer && (
          <div className="inline-error is-time" role="status">
            <p>Time is up. Finish the session to see how this seat was marked, or save and exit to keep it in progress.</p>
          </div>
        )}

        {!answer && (
          <div className="question-actions">
            <button className="button button-primary button-large" disabled={checking} onClick={submit} type="button">
              {checking ? 'Checking answer…' : 'Submit answer'}
            </button>
            {checking && <span className="checking-note" role="status">Reading against the marking scheme…</span>}
          </div>
        )}

        {answer && (
          <FeedbackPanel
            answer={answer}
            held={session.mode === 'test'}
            isLast={isLast}
            onNext={next}
            onRetry={retry}
          />
        )}
      </article>
    </main>
  )
}

function FeedbackPanel({
  answer,
  held,
  isLast,
  onNext,
  onRetry,
}: {
  answer: AnswerRecord
  held: boolean
  isLast: boolean
  onNext: () => void
  onRetry: () => void
}) {
  const lost = answer.total - answer.awarded

  return (
    <section className={`feedback-panel${held ? ' is-held' : ''}`} aria-live="polite">
      <header className="feedback-head">
        <div>
          <h2>{held ? 'Answer recorded' : 'Examiner feedback'}</h2>
          <p>{held ? 'This is a test session, so marks are held until the end.' : 'Sample marking, written the way an examiner would note it.'}</p>
        </div>
        {!held && (
          <p className="feedback-score">
            <span className="feedback-awarded">{answer.awarded}</span>
            <span className="feedback-total">/{answer.total}</span>
            <span className="feedback-lost">{lost > 0 ? `−${lost} marks lost` : 'full marks'}</span>
          </p>
        )}
      </header>

      {!held && <p className="feedback-note">{answer.note}</p>}

      {!held && (
        <div className="model-points">
          <h3>Marking points</h3>
          <ol>
            {answer.modelPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ol>
        </div>
      )}

      <div className="feedback-actions">
        <button className="button button-quiet" onClick={onRetry} type="button">
          {held ? 'Rewrite answer' : 'Try this answer again'}
        </button>
        <button className="button button-primary" onClick={onNext} type="button">
          {isLast ? 'Finish session' : 'Next question'}
        </button>
      </div>
    </section>
  )
}

function remainingSeconds(session: Session): number {
  const elapsed = Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000)
  return Math.max(0, session.minutes * 60 - elapsed)
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
