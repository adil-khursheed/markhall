'use client'

import { useState } from 'react'
import { ArrowLeft } from './ArrowLeft'
import { boards, boardLabel, currentSeat, grades, seatNumber } from './data'
import type { SeatTarget, SessionMode, SessionSetupValues, Subject } from './types'

type SessionSetupProps = {
  subjects: Subject[]
  initialBoard: string
  initialGrade: string
  initialTarget: SeatTarget | null
  onBegin: (values: SessionSetupValues) => void
  onCancel: () => void
}

const modes: Array<{ id: SessionMode; label: string; description: string }> = [
  { id: 'practice', label: 'Practice', description: 'Answer with feedback after every question.' },
  { id: 'revise', label: 'Revise', description: 'Shorter recall prompts with model points.' },
  { id: 'test', label: 'Test', description: 'Answer the set, then see the marking at the end.' },
]

const durations = [15, 25, 40]

export function SessionSetup({
  subjects,
  initialBoard,
  initialGrade,
  initialTarget,
  onBegin,
  onCancel,
}: SessionSetupProps) {
  const fallback = currentSeat(subjects)
  const firstSubject = initialTarget
    ? subjects.find((subject) => subject.id === initialTarget.subjectId) ?? subjects[0]
    : fallback?.subject ?? subjects[0]
  const firstChapterId =
    initialTarget?.chapterId ??
    fallback?.chapter.id ??
    firstSubject.chapters[0]?.id ??
    ''

  const [board, setBoard] = useState(initialBoard)
  const [grade, setGrade] = useState(initialGrade)
  const [subjectId, setSubjectId] = useState(firstSubject.id)
  const [chapterId, setChapterId] = useState(firstChapterId)
  const [mode, setMode] = useState<SessionMode>('practice')
  const [minutes, setMinutes] = useState(25)

  const subject = subjects.find((item) => item.id === subjectId) ?? subjects[0]
  const chapter = subject.chapters.find((item) => item.id === chapterId) ?? subject.chapters[0]
  const seat = seatNumber(subjects, subject.id, subject.chapters.indexOf(chapter))

  function changeSubject(nextId: string) {
    const next = subjects.find((item) => item.id === nextId)
    if (!next) return
    setSubjectId(nextId)
    setChapterId(next.chapters[0]?.id ?? '')
  }

  return (
    <main className="main-column setup-column">
      <button className="back-link" onClick={onCancel} type="button">
        <ArrowLeft /> Back to dashboard
      </button>

      <section className="setup-card" aria-labelledby="setup-title">
        <div className="setup-head">
          <div>
            <h1 id="setup-title">Set up your session</h1>
            <p className="setup-sub">
              Seat {String(seat).padStart(2, '0')} · {subject.name} · {chapter.name}
            </p>
            <p className="setup-note">Board and class set the session label. Questions are sample content.</p>
          </div>
          <div className="setup-stamp" aria-hidden="true">
            <span>{boardLabel(board)}</span>
            <span>Class {grade}</span>
          </div>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            onBegin({ board, grade, subjectId, chapterId, mode, minutes })
          }}
        >
          <div className="field-row">
            <label className="field">
              <span className="field-label">Board</span>
              <select className="input" onChange={(event) => setBoard(event.target.value)} value={board}>
                {boards.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span className="field-label">Class</span>
              <select className="input" onChange={(event) => setGrade(event.target.value)} value={grade}>
                {grades.map((value) => (
                  <option key={value} value={value}>
                    Class {value}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="field-row">
            <label className="field">
              <span className="field-label">Subject</span>
              <select className="input" onChange={(event) => changeSubject(event.target.value)} value={subjectId}>
                {subjects.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span className="field-label">Chapter</span>
              <select className="input" onChange={(event) => setChapterId(event.target.value)} value={chapterId}>
                {subject.chapters.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <fieldset className="field-group">
            <legend className="field-label">Session mode</legend>
            <div className="mode-choice">
              {modes.map((item) => (
                <label className={`mode-option${mode === item.id ? ' is-selected' : ''}`} key={item.id}>
                  <input
                    checked={mode === item.id}
                    name="mode"
                    onChange={() => setMode(item.id)}
                    type="radio"
                    value={item.id}
                  />
                  <span className="mode-label">{item.label}</span>
                  <span className="mode-description">{item.description}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="field-group">
            <legend className="field-label">Time on the clock</legend>
            <div className="duration-choice">
              {durations.map((value) => (
                <label className={`duration-option${minutes === value ? ' is-selected' : ''}`} key={value}>
                  <input
                    checked={minutes === value}
                    name="minutes"
                    onChange={() => setMinutes(value)}
                    type="radio"
                    value={value}
                  />
                  <span className="duration-value">{value}</span>
                  <span className="duration-unit">min</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="setup-actions">
            <button className="button button-primary button-large" type="submit">
              Begin session
              <span className="button-meta">{minutes} min</span>
            </button>
            <button className="button button-quiet" onClick={onCancel} type="button">
              Cancel
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}
