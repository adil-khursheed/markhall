'use client'

import type { ReactNode } from 'react'

import { signOut } from '@/app/(frontend)/actions'
import { Wordmark } from '@/components/brand/Wordmark'

type AppShellProps = {
  children: ReactNode
  active: 'dashboard' | 'practice' | 'mock' | 'library' | 'doubts'
  onDashboard: () => void
  onPractice: () => void
  onDoubts?: () => void
  board: string
  coveragePercent?: number
  grade: string
  sessionActive: boolean
  user: { email: string; name: string }
}

export function AppShell({
  children,
  active,
  onDashboard,
  onPractice,
  onDoubts,
  board,
  coveragePercent,
  grade,
  sessionActive,
  user,
}: AppShellProps) {
  const initial = (user.name.trim() || user.email).charAt(0).toUpperCase()

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="wordmark-button" onClick={onDashboard} title="Dashboard" type="button">
          <Wordmark />
        </button>
        <div className="topbar-meta">
          <span className="roll-line">
            Class {grade} · {board}
          </span>
          <span className="topbar-rule" aria-hidden="true" />
          <span className="coverage">
            <span className="coverage-label">Syllabus coverage</span>
            <span className="coverage-label-short">Coverage</span>
            <span className="coverage-value">
              {coveragePercent === undefined ? '—' : `${coveragePercent}%`}
            </span>
          </span>
        </div>
        <div className="topbar-actions">
          {active !== 'doubts' && <span className="sample-chip">Sample data</span>}
          <span className="student-mark" aria-label={`Signed in as ${user.name}`} title={user.name}>
            {initial}
          </span>
          <form action={signOut}>
            <button className="topbar-signout" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <div className={`shell-body${active === 'dashboard' ? '' : ' is-focus'}`}>
        <nav className="side-rail" aria-label="Main navigation">
          <button
            aria-current={active === 'dashboard' ? 'page' : undefined}
            className={`nav-item${active === 'dashboard' ? ' is-active' : ''}`}
            onClick={onDashboard}
            type="button"
          >
            Dashboard
          </button>
          <button
            aria-current={active === 'practice' ? 'page' : undefined}
            className={`nav-item${active === 'practice' ? ' is-active' : ''}`}
            onClick={onPractice}
            type="button"
          >
            Practice
            {sessionActive && <span className="nav-live" aria-label="session in progress" />}
          </button>
          {onDoubts ? (
            <button
              aria-current={active === 'doubts' ? 'page' : undefined}
              className={`nav-item${active === 'doubts' ? ' is-active' : ''}`}
              onClick={onDoubts}
              type="button"
            >
              Ask a doubt
            </button>
          ) : (
            <span className="nav-item is-disabled" aria-disabled="true">
              Ask a doubt
              <span className="nav-soon">Soon</span>
            </span>
          )}
          <span className="nav-item is-disabled" aria-disabled="true">
            Mock tests
            <span className="nav-soon">Soon</span>
          </span>
          <span className="nav-item is-disabled" aria-disabled="true">
            Question bank
            <span className="nav-soon">Soon</span>
          </span>
          <div className="rail-foot">
            <p className="rail-note">Syllabus coverage is calculated from your stamped seats.</p>
            <button className="rail-link" onClick={onPractice} type="button">
              Start a session
            </button>
          </div>
        </nav>

        {children}
      </div>

      <nav className="bottom-nav" aria-label="Main navigation">
        <button
          aria-current={active === 'dashboard' ? 'page' : undefined}
          className={`bottom-item${active === 'dashboard' ? ' is-active' : ''}`}
          onClick={onDashboard}
          type="button"
        >
          Dashboard
        </button>
        <button
          aria-current={active === 'practice' ? 'page' : undefined}
          className={`bottom-item${active === 'practice' ? ' is-active' : ''}`}
          onClick={onPractice}
          type="button"
        >
          Practice
          {sessionActive && <span className="nav-live" aria-label="session in progress" />}
        </button>
        {onDoubts ? (
          <button
            aria-current={active === 'doubts' ? 'page' : undefined}
            className={`bottom-item${active === 'doubts' ? ' is-active' : ''}`}
            onClick={onDoubts}
            type="button"
          >
            Ask a doubt
          </button>
        ) : (
          <span className="bottom-item is-disabled" aria-disabled="true">
            Ask a doubt · Soon
          </span>
        )}
        <span className="bottom-item is-disabled" aria-disabled="true">
          Mock tests · Soon
        </span>
      </nav>
    </div>
  )
}
