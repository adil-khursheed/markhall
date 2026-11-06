'use client'

import { currentSeat, getChapter, getSubject, nextActionableSeats, overallCoverage, weakSeats } from './data'
import { RollCallStrip } from './RollCallStrip'
import { SeatGrid } from './SeatGrid'
import type { SeatTarget, Session, Subject } from './types'

type DashboardProps = {
  subjects: Subject[]
  session: Session | null
  onStart: (target: SeatTarget) => void
  onResume: () => void
  onDiscard: () => void
}

export function Dashboard({ subjects, session, onStart, onResume, onDiscard }: DashboardProps) {
  const current = currentSeat(subjects)
  const overall = overallCoverage(subjects)
  const weak = weakSeats(subjects)
  const blocks = nextActionableSeats(subjects, 3)
  const currentTarget = current ? { subjectId: current.subject.id, chapterId: current.chapter.id } : null

  return (
    <>
      <main className="main-column">
        {session && (
          <div className="resume-banner" role="status">
            <div>
              <p className="resume-title">Session paused</p>
              <p className="resume-copy">
                {getSubject(subjects, session.subjectId)?.name} ·{' '}
                {getChapter(subjects, session.subjectId, session.chapterId)?.name}
              </p>
            </div>
            <div className="resume-actions">
              <button className="button button-primary" onClick={onResume} type="button">
                Resume
              </button>
              <button className="button button-quiet" onClick={onDiscard} type="button">
                Discard
              </button>
            </div>
          </div>
        )}

        <section className="now-seat" aria-labelledby="now-seat-title">
          <div className="now-seat-copy">
            <h1 id="now-seat-title">
              {current ? current.chapter.name : 'Your syllabus is fully stamped'}
            </h1>
            <p className="now-seat-sub">
              {current
                ? `Next seat ${String(current.seat).padStart(2, '0')} · ${current.subject.name} · ${overall.percent}% of seats present. A 25-minute session moves this seat to present.`
                : 'Every seat is present. Revisit a weak seat or take a sample paper to keep the room warm.'}
            </p>
          </div>
          <div className="now-seat-actions">
            {currentTarget ? (
              <button
                className="button button-primary button-large"
                onClick={() => onStart(currentTarget)}
                type="button"
              >
                Start revision
                <span className="button-meta">25 min</span>
              </button>
            ) : (
              <button
                className="button button-primary button-large"
                onClick={() => onStart({ subjectId: subjects[0].id, chapterId: subjects[0].chapters[0].id })}
                type="button"
              >
                Revisit a seat
              </button>
            )}
            <p className="now-seat-foot">
              {current
                ? current.chapter.lastScore !== undefined
                  ? `Last checked ${current.chapter.lastScore}/10`
                  : 'Not checked yet'
                : 'No seat currently in progress'}
            </p>
          </div>
        </section>

        <RollCallStrip subjects={subjects} />
        <SeatGrid current={current ? { subjectId: current.subject.id, chapterId: current.chapter.id } : null} onStart={onStart} subjects={subjects} />
      </main>

      <aside className="right-rail" aria-label="Today">
        <section className="rail-card mock-card">
          <div className="rail-card-head">
            <h2>Next mock</h2>
            <span className="sample-tag">Sample</span>
          </div>
          <p className="mock-title">Mathematics · Paper 1</p>
          <p className="mock-meta">80 marks · 2 hours · full syllabus</p>
          <p className="mock-state">Not attempted</p>
          <p className="mock-note">Full-syllabus sample paper. Mock tests are not open yet.</p>
        </section>

        <section className="rail-card">
          <div className="rail-card-head">
            <h2>Today&apos;s blocks</h2>
            <span className="rail-count">{blocks.length}</span>
          </div>
          {blocks.length === 0 ? (
            <p className="rail-empty">No blocks left. Every seat is present or in progress.</p>
          ) : (
            <ul className="block-list">
              {blocks.map((block) => (
                <li key={`${block.subject.id}-${block.chapter.id}`}>
                  <button className="block-row" onClick={() => onStart({ subjectId: block.subject.id, chapterId: block.chapter.id })} type="button">
                    <span className="block-seat">{String(block.seat).padStart(2, '0')}</span>
                    <span className="block-copy">
                      <span className="block-subject">{block.subject.code}</span>
                      <span className="block-name">{block.chapter.name}</span>
                    </span>
                    <span className="block-time">{block.chapter.state === 'weak' ? '25 min' : '20 min'}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rail-card">
          <div className="rail-card-head">
            <h2>Weak seats</h2>
            <span className="rail-count is-red">{weak.length}</span>
          </div>
          {weak.length === 0 ? (
            <div className="rail-empty">
              <p>No weak seats marked.</p>
              <p>Seats turn red when a session scores below 6/10.</p>
            </div>
          ) : (
            <ul className="weak-list">
              {weak.slice(0, 4).map((seat) => (
                <li key={`${seat.subject.id}-${seat.chapter.id}`}>
                  <button
                    className="weak-row"
                    onClick={() => onStart({ subjectId: seat.subject.id, chapterId: seat.chapter.id })}
                    type="button"
                  >
                    <span className="weak-copy">
                      <span className="weak-subject">{seat.subject.name}</span>
                      <span className="weak-name">{seat.chapter.name}</span>
                    </span>
                    <span className="weak-lost">−{seat.chapter.marksLost ?? 0}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {weak.length > 0 && (
            <p className="rail-footnote">
              {weak.length > 4 ? `Showing 4 of ${weak.length} weak seats. ` : ''}
              Marks lost in the last sample session. Every weak seat is marked red in the plan.
            </p>
          )}
        </section>
      </aside>
    </>
  )
}
