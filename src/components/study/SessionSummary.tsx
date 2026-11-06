'use client'

import {
  boardLabel,
  coverage,
  getChapter,
  getSubject,
  overallCoverage,
  seatNumber,
  seatStateLabel,
} from './data'
import type { Question, SessionResult, SeatTarget, Subject } from './types'

type SessionSummaryProps = {
  result: SessionResult
  subjects: Subject[]
  questions: Question[]
  onDone: () => void
  onStartNext: (target: SeatTarget) => void
}

export function SessionSummary({ result, subjects, questions, onDone, onStartNext }: SessionSummaryProps) {
  const subject = getSubject(subjects, result.session.subjectId)
  const chapter = getChapter(subjects, result.session.subjectId, result.session.chapterId)
  if (!subject || !chapter) {
    return (
      <main className="main-column">
        <p className="rail-empty">This session no longer matches the seating plan.</p>
        <button className="button button-primary" onClick={onDone} type="button">
          Back to dashboard
        </button>
      </main>
    )
  }

  const index = subject.chapters.indexOf(chapter)
  const seat = seatNumber(subjects, subject.id, index)
  const info = coverage(subject)
  const overall = overallCoverage(subjects)
  const passed = result.total > 0 && result.awarded / result.total >= 0.6
  const next = result.nextChapterId
    ? subject.chapters.find((item) => item.id === result.nextChapterId)
    : subject.chapters.find((item) => item.state !== 'present' && item.id !== chapter.id)

  return (
    <main className="main-column summary-column">
      <section className="summary-card" aria-labelledby="summary-title">
        <header className="summary-head">
          <div>
            <h1 id="summary-title">Seat {String(seat).padStart(2, '0')} is {passed ? 'stamped present' : 'marked weak'}</h1>
            <p className="summary-sub">
              {subject.name} · {chapter.name} · {seatStateLabel[chapter.state]}
            </p>
            <p className="summary-context">
              {boardLabel(result.session.board)} · Class {result.session.grade}
            </p>
          </div>
          <div className={`stamp${passed ? '' : ' stamp-weak'}`} aria-label={passed ? 'Present stamp' : 'Weak seat stamp'}>
            <span className="stamp-top">{passed ? 'MARKHALL' : 'REVIEW'}</span>
            <span className="stamp-main">{passed ? 'PRESENT' : 'WEAK SEAT'}</span>
            <span className="stamp-foot">{formatDate(result.completedAt)}</span>
          </div>
        </header>

        <div className="summary-stats">
          <div className="summary-stat">
            <span className="summary-stat-value">
              {result.awarded}
              <span className="summary-stat-total">/{result.total}</span>
            </span>
            <span className="summary-stat-label">Marks this session</span>
          </div>
          <div className="summary-stat">
            <span className="summary-stat-value">{Math.round((result.awarded / Math.max(1, result.total)) * 100)}%</span>
            <span className="summary-stat-label">Accuracy</span>
          </div>
          <div className="summary-stat">
            <span className="summary-stat-value">
              {info.present}
              <span className="summary-stat-total">/{info.total}</span>
            </span>
            <span className="summary-stat-label">{subject.code} seats present</span>
          </div>
          <div className="summary-stat">
            <span className="summary-stat-value">{overall.percent}%</span>
            <span className="summary-stat-label">Whole syllabus</span>
          </div>
        </div>

        <p className="summary-copy">
          {passed
            ? 'The seat is stamped. The roll call has moved, and the next seat is ringed on the dashboard.'
            : 'The seat stays red because the session scored below 6/10. The marking points below name what to revise before you try again.'}
        </p>

        <section className="summary-breakdown" aria-labelledby="breakdown-title">
          <h2 id="breakdown-title">Marking breakdown</h2>
          <ol className="breakdown-list">
            {questions.map((question) => {
              const answer = result.session.answers[question.id]
              if (!answer) return null
              return (
                <li key={question.id}>
                  <div className="breakdown-head">
                    <p className="breakdown-prompt">{question.prompt}</p>
                    <span className={`breakdown-score${answer.awarded < answer.total / 2 ? ' is-low' : ''}`}>
                      {answer.awarded}/{answer.total}
                    </span>
                  </div>
                  <p className="breakdown-note">{answer.note}</p>
                </li>
              )
            })}
          </ol>
        </section>

        <div className="summary-next">
          <div>
            <p className="summary-next-label">Next seat</p>
            <p className="summary-next-name">
              {next
                ? `${String(seatNumber(subjects, subject.id, subject.chapters.indexOf(next))).padStart(2, '0')} · ${next.name}`
                : 'All seats in this subject are present'}
            </p>
          </div>
          <div className="summary-actions">
            {next && (
              <button
                className="button button-primary"
                onClick={() => onStartNext({ subjectId: subject.id, chapterId: next.id })}
                type="button"
              >
                Start next seat
              </button>
            )}
            <button className="button button-quiet" onClick={onDone} type="button">
              Back to dashboard
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
}
