'use client'

import { coverage, overallCoverage } from './data'
import type { Subject } from './types'

type RollCallStripProps = {
  subjects: Subject[]
}

export function RollCallStrip({ subjects }: RollCallStripProps) {
  const overall = overallCoverage(subjects)

  return (
    <section className="roll-call" aria-labelledby="roll-call-title">
      <div className="roll-call-head">
        <div>
          <h2 id="roll-call-title">Roll call</h2>
          <p className="roll-call-sub">Seats stamped present across the syllabus.</p>
        </div>
        <p className="roll-total">
          <span className="roll-total-value">
            {overall.present}
            <span className="roll-total-divider">/</span>
            {overall.total}
          </span>
          <span className="roll-total-label">{overall.percent}% coverage</span>
        </p>
      </div>

      <ul className="subject-roll" aria-label="Coverage by subject">
        {subjects.map((subject) => {
          const info = coverage(subject)
          return (
            <li className="subject-roll-item" key={subject.id}>
              <div className="subject-roll-line">
                <span className="subject-code">{subject.code}</span>
                <span className="subject-name">{subject.name}</span>
                <span className="subject-count">
                  {info.present}/{info.total}
                </span>
              </div>
              <div
                aria-label={`${subject.name}: ${info.present} of ${info.total} chapters present`}
                aria-valuemax={info.total}
                aria-valuemin={0}
                aria-valuenow={info.present}
                className="coverage-track"
                role="progressbar"
              >
                <span className="coverage-fill" style={{ width: `${info.percent}%` }} />
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
