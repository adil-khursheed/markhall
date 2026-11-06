'use client'

import { coverage, seatNumber, seatStateLabel } from './data'
import type { Chapter, SeatTarget, Subject } from './types'

type SeatGridProps = {
  subjects: Subject[]
  current: { subjectId: string; chapterId: string } | null
  onStart: (target: SeatTarget) => void
}

export function SeatGrid({ subjects, current, onStart }: SeatGridProps) {
  return (
    <section className="seat-map" aria-labelledby="seat-map-title">
      <div className="seat-map-head">
        <div>
          <h2 id="seat-map-title">Seating plan</h2>
          <p className="seat-map-sub">Every chapter sits in a numbered seat. Stamp it by finishing a session.</p>
        </div>
        <ul className="seat-legend" aria-label="Seat states">
          <li>
            <span className="legend-mark is-not-started" aria-hidden="true" />
            Not started
          </li>
          <li>
            <span className="legend-mark is-in-progress" aria-hidden="true" />
            In progress
          </li>
          <li>
            <span className="legend-mark is-present" aria-hidden="true" />
            Present
          </li>
          <li>
            <span className="legend-mark is-weak" aria-hidden="true" />
            Weak
          </li>
        </ul>
      </div>

      <div className="subject-seats">
        {subjects.map((subject) => {
          const info = coverage(subject)
          return (
            <article className="subject-block" key={subject.id}>
              <header className="subject-block-head">
                <h3>
                  <span className="subject-code">{subject.code}</span>
                  {subject.name}
                </h3>
                <p>
                  {info.present}/{info.total} present
                  {info.weak > 0 ? ` · ${info.weak} weak` : ''}
                </p>
              </header>
              <div className="seat-row">
                {subject.chapters.map((chapter, index) => {
                  const seat = seatNumber(subjects, subject.id, index)
                  const isCurrent = current?.subjectId === subject.id && current.chapterId === chapter.id
                  return (
                    <SeatCell
                      chapter={chapter}
                      isCurrent={isCurrent}
                      key={chapter.id}
                      onStart={() => onStart({ subjectId: subject.id, chapterId: chapter.id })}
                      seat={seat}
                    />
                  )
                })}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function SeatCell({
  chapter,
  isCurrent,
  onStart,
  seat,
}: {
  chapter: Chapter
  isCurrent: boolean
  onStart: () => void
  seat: number
}) {
  return (
    <button
      className={`seat-cell is-${chapter.state}${isCurrent ? ' is-current' : ''}`}
      onClick={onStart}
      title={`${chapter.name} — ${seatStateLabel[chapter.state]}`}
      type="button"
    >
      <span className="seat-number">{String(seat).padStart(2, '0')}</span>
      <span className="seat-name">{chapter.name}</span>
      <span className="seat-state">
        {isCurrent ? 'Start here' : seatStateLabel[chapter.state]}
        {chapter.lastScore !== undefined && chapter.state !== 'in-progress' ? ` · ${chapter.lastScore}/10` : ''}
      </span>
      {chapter.state === 'present' && (
        <span className="seat-stamp" aria-hidden="true">
          Present
        </span>
      )}
      {chapter.state === 'weak' && <span className="seat-weak-mark" aria-hidden="true" />}
    </button>
  )
}
