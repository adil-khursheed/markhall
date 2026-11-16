'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import rehypeKatex from 'rehype-katex'
import remarkMath from 'remark-math'

type ChapterOption = { id: number; title: string; subjectName: string }

type PracticeQuestion = {
  id: number
  stem: string
  type: 'mcq' | 'numeric' | 'short' | 'long'
  marks: number
  options: string[]
}

type StartResult = {
  chapterId: number
  chapterTitle: string
  subjectName: string
  questions: PracticeQuestion[]
}

type Verdict = { correct: boolean | null; correctAnswer?: string | null; note?: string }

function Stem({ children }: { children: string }) {
  return (
    <div className="mock-stem">
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
        {children}
      </ReactMarkdown>
    </div>
  )
}

export function PracticeDesk({
  chapters,
  initialChapterId,
}: {
  chapters: ChapterOption[]
  initialChapterId?: number
}) {
  const router = useRouter()
  const [chapterId, setChapterId] = useState<number | undefined>(initialChapterId)
  const [session, setSession] = useState<StartResult | null>(null)
  const [current, setCurrent] = useState(0)
  const [response, setResponse] = useState('')
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const start = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      const result = await fetch('/api/practice', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'start', chapterId }),
      })
      const data = (await result.json().catch(() => null)) as (StartResult & { error?: string }) | null
      if (!result.ok || !data?.questions?.length) {
        setError(data?.error ?? 'Practice could not start. Try again.')
        return
      }
      setSession(data)
      setCurrent(0)
      setResponse('')
      setVerdict(null)
      setScore({ correct: 0, total: 0 })
    } catch {
      setError('Practice could not start. Try again.')
    } finally {
      setBusy(false)
    }
  }, [chapterId])

  const check = useCallback(async () => {
    if (!session) return
    const question = session.questions[current]
    if (!question || !response.trim()) return
    setBusy(true)
    setError(null)
    try {
      const result = await fetch('/api/practice', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'answer', questionId: question.id, response }),
      })
      const data = (await result.json().catch(() => null)) as (Verdict & { error?: string }) | null
      if (!result.ok || !data || data.error) {
        setError(data?.error ?? 'That answer could not be checked. Try again.')
        return
      }
      setVerdict({ correct: data.correct, correctAnswer: data.correctAnswer, note: data.note })
      if (data.correct != null) {
        setScore((previous) => ({
          correct: previous.correct + (data.correct ? 1 : 0),
          total: previous.total + 1,
        }))
      }
    } catch {
      setError('That answer could not be checked. Try again.')
    } finally {
      setBusy(false)
    }
  }, [current, response, session])

  const next = useCallback(() => {
    if (!session) return
    if (current >= session.questions.length - 1) {
      setSession({ ...session }) // stay on the summary card
      setCurrent(session.questions.length)
      return
    }
    setCurrent((index) => index + 1)
    setResponse('')
    setVerdict(null)
  }, [current, session])

  const question = session && current < session.questions.length ? session.questions[current] : null
  const finished = session && current >= session.questions.length

  return (
    <section className="practice-desk" aria-label="Practice">
      {!session && (
        <div className="practice-pick">
          <h1>Practice</h1>
          <p className="practice-sub">
            Objective questions from the reviewed bank. Every answer updates your chapter mastery.
          </p>
          {chapters.length === 0 ? (
            <p className="mock-empty">No chapters match your profile yet. Ask your admin to set up subjects.</p>
          ) : (
            <>
              <label className="mock-answer-label" htmlFor="chapter-pick">
                Chapter
              </label>
              <select
                className="mock-answer practice-select"
                id="chapter-pick"
                onChange={(event) => setChapterId(Number(event.target.value) || undefined)}
                value={chapterId ?? ''}
              >
                <option value="">My weakest chapter</option>
                {chapters.map((chapter) => (
                  <option key={chapter.id} value={chapter.id}>
                    {chapter.subjectName} · {chapter.title}
                  </option>
                ))}
              </select>
              <div className="practice-actions">
                <button className="button button-primary button-large" disabled={busy} onClick={() => void start()} type="button">
                  {busy ? 'Preparing…' : 'Start practice'}
                </button>
                {error && <span className="mock-error-text">{error}</span>}
              </div>
            </>
          )}
        </div>
      )}

      {session && question && (
        <div className="practice-run">
          <header className="mock-run-head">
            <div>
              <h1 className="mock-run-title">{session.subjectName} · {session.chapterTitle}</h1>
              <p className="mock-run-meta">
                Question {current + 1} of {session.questions.length} · {score.correct}/{score.total} correct
              </p>
            </div>
          </header>

          <article className="mock-question">
            <p className="mock-question-meta">
              {question.marks} mark{question.marks === 1 ? '' : 's'} ·{' '}
              {question.type === 'mcq' ? 'Multiple choice' : 'Numerical answer'}
            </p>
            <Stem>{question.stem}</Stem>

            {question.type === 'mcq' ? (
              <div className="mock-options" role="radiogroup" aria-label="Answer options">
                {question.options.map((optionText, index) => (
                  <button
                    aria-checked={response === optionText}
                    className={`mock-option${response === optionText ? ' is-picked' : ''}${
                      verdict && optionText === verdict.correctAnswer ? ' is-revealed' : ''
                    }`}
                    disabled={verdict != null}
                    key={index}
                    onClick={() => setResponse(optionText)}
                    role="radio"
                    type="button"
                  >
                    <span className="mock-option-letter">{String.fromCharCode(65 + index)}</span>
                    <Stem>{optionText}</Stem>
                  </button>
                ))}
              </div>
            ) : (
              <>
                <label className="mock-answer-label" htmlFor="practice-answer">
                  Your answer (a number)
                </label>
                <textarea
                  className="mock-answer"
                  id="practice-answer"
                  inputMode="decimal"
                  onChange={(event) => setResponse(event.target.value)}
                  rows={2}
                  value={response}
                />
              </>
            )}

            {verdict && (
              <p
                className={`practice-verdict${verdict.correct == null ? '' : verdict.correct ? ' is-correct' : ' is-wrong'}`}
                role="status"
              >
                {verdict.correct == null
                  ? (verdict.note ?? 'This answer could not be machine-checked.')
                  : verdict.correct
                    ? 'Correct.'
                    : `Not quite.${verdict.correctAnswer ? ` The answer is ${verdict.correctAnswer}.` : ''}`}
              </p>
            )}
            {error && (
              <p className="mock-error-text" role="alert">
                {error}
              </p>
            )}
          </article>

          <footer className="mock-run-foot">
            <button className="button button-primary" disabled={busy || !response.trim() || verdict != null} onClick={() => void check()} type="button">
              {busy ? 'Checking…' : 'Check answer'}
            </button>
            {verdict !== null && (
              <button className="button" onClick={next} type="button">
                {current >= session.questions.length - 1 ? 'Finish' : 'Next question'}
              </button>
            )}
          </footer>
        </div>
      )}

      {session && finished && (
        <div className="practice-pick">
          <h1>Session stamped</h1>
          <p className="practice-sub">
            {score.correct} of {score.total} correct in {session.chapterTitle}. Your mastery for this chapter has been updated.
          </p>
          <div className="practice-actions">
            <button className="button button-primary" onClick={() => setSession(null)} type="button">
              Practise another chapter
            </button>
            <button className="button button-quiet" onClick={() => router.push('/dashboard')} type="button">
              Back to dashboard
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
