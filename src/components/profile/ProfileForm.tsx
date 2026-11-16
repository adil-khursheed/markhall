'use client'

import { useEffect, useId, useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'

import { changePassword, saveProfile, type ProfileState } from '@/app/(frontend)/actions'

type ProfileFormProps = {
  board: string
  classLevel: number | null
  email: string
  incomplete: boolean
  name: string
  preferredLanguage: string
  targetExamYear: number | null
}

const BOARDS = [
  { value: 'cbse', label: 'CBSE' },
  { value: 'icse', label: 'ICSE / CISCE' },
  { value: 'up', label: 'UP Board' },
]

const CLASSES = [6, 7, 8, 9, 10, 11, 12]

export function ProfileForm({
  board: initialBoard,
  classLevel: initialClassLevel,
  email,
  incomplete,
  name: initialName,
  preferredLanguage: initialLanguage,
  targetExamYear,
}: ProfileFormProps) {
  const router = useRouter()
  const detailsId = useId()
  const passwordId = useId()
  const [detailState, detailAction, detailPending] = useActionState(saveProfile, {} as ProfileState)
  const [passwordState, passwordAction, passwordPending] = useActionState(
    changePassword,
    {} as ProfileState,
  )
  const [name, setName] = useState(initialName)
  const [board, setBoard] = useState(initialBoard)
  const [classLevel, setClassLevel] = useState<number | null>(initialClassLevel)
  const [language, setLanguage] = useState(initialLanguage)

  useEffect(() => {
    if (!detailState.saved) return
    if (incomplete) {
      router.push('/dashboard')
    } else {
      router.refresh()
    }
  }, [detailState.saved, incomplete, router])

  return (
    <>
      <form action={detailAction} className="profile-form" aria-label="Your details">
        <div className="field">
          <label className="field-label" htmlFor={`${detailsId}-name`}>
            Name on the roll
          </label>
          <input
            autoComplete="name"
            className="input"
            id={`${detailsId}-name`}
            name="name"
            onChange={(event) => setName(event.target.value)}
            required
            type="text"
            value={name}
          />
        </div>

        <div className="field">
          <span className="field-label" id={`${detailsId}-email-label`}>
            Email
          </span>
          <p className="profile-static" aria-labelledby={`${detailsId}-email-label`}>
            {email}
          </p>
        </div>

        <fieldset className="field-group">
          <legend className="field-label">Board</legend>
          <div className="mode-choice" role="radiogroup" aria-label="Board">
            {BOARDS.map((option) => (
              <label
                className={`mode-option${board === option.value ? ' is-selected' : ''}`}
                key={option.value}
              >
                <input
                  checked={board === option.value}
                  name="board"
                  onChange={() => setBoard(option.value)}
                  type="radio"
                  value={option.value}
                />
                <span className="mode-label">{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="field-group">
          <legend className="field-label">Class</legend>
          <div className="duration-choice" role="radiogroup" aria-label="Class">
            {CLASSES.map((value) => (
              <label
                className={`duration-option${classLevel === value ? ' is-selected' : ''}`}
                key={value}
              >
                <input
                  checked={classLevel === value}
                  name="classLevel"
                  onChange={() => setClassLevel(value)}
                  type="radio"
                  value={value}
                />
                <span className="duration-value">{value}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="field-row">
          <div className="field">
            <label className="field-label" htmlFor={`${detailsId}-exam-year`}>
              Target exam year (optional)
            </label>
            <input
              className="input"
              defaultValue={targetExamYear ?? ''}
              id={`${detailsId}-exam-year`}
              inputMode="numeric"
              max={2035}
              min={2026}
              name="targetExamYear"
              placeholder="e.g. 2028"
              type="number"
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor={`${detailsId}-language`}>
              Preferred language
            </label>
            <select
              className="input"
              id={`${detailsId}-language`}
              name="preferredLanguage"
              onChange={(event) => setLanguage(event.target.value)}
              value={language}
            >
              <option value="en">English</option>
              <option value="hi">Hindi</option>
            </select>
          </div>
        </div>

        {detailState.error && (
          <p className="mock-error-text" role="alert">
            {detailState.error}
          </p>
        )}
        {!detailState.error && detailState.saved && !incomplete && (
          <p className="profile-saved" role="status">
            Details saved.
          </p>
        )}

        <div className="profile-actions">
          <button className="button button-primary button-large" disabled={detailPending} type="submit">
            {detailPending ? 'Saving…' : incomplete ? 'Save and open my desk' : 'Save changes'}
          </button>
        </div>
      </form>

      <form action={passwordAction} className="profile-form" aria-label="Change password">
        <h2>Password</h2>
        <div className="field-row">
          <div className="field">
            <label className="field-label" htmlFor={`${passwordId}-current`}>
              Current password
            </label>
            <input
              autoComplete="current-password"
              className="input"
              id={`${passwordId}-current`}
              name="current"
              required
              type="password"
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor={`${passwordId}-next`}>
              New password
            </label>
            <input
              autoComplete="new-password"
              className="input"
              id={`${passwordId}-next`}
              minLength={8}
              name="next"
              required
              type="password"
            />
          </div>
        </div>
        <p className="profile-hint">Use at least 8 characters.</p>

        {passwordState.error && (
          <p className="mock-error-text" role="alert">
            {passwordState.error}
          </p>
        )}
        {!passwordState.error && passwordState.saved && (
          <p className="profile-saved" role="status">
            Password updated.
          </p>
        )}

        <div className="profile-actions">
          <button className="button" disabled={passwordPending} type="submit">
            {passwordPending ? 'Updating…' : 'Change password'}
          </button>
        </div>
      </form>
    </>
  )
}
