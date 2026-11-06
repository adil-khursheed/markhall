'use client'

import { useEffect, useState } from 'react'
import { AppShell } from './AppShell'
import { Dashboard } from './Dashboard'
import {
  boardLabel,
  currentSeat,
  defaultSubjects,
  overallCoverage,
  questionsForSession,
  sessionQuestions,
} from './data'
import { Practice } from './Practice'
import { SessionSetup } from './SessionSetup'
import { SessionSummary } from './SessionSummary'
import type {
  AnswerRecord,
  SeatTarget,
  Session,
  SessionResult,
  SessionSetupValues,
  StudentProfile,
  Subject,
} from './types'

type Screen = 'dashboard' | 'setup' | 'practice' | 'summary'

type StoredState = {
  version: 2
  profile: StudentProfile
  subjects: Subject[]
  session: Session | null
}

const LEGACY_STORAGE_KEY = 'icse-prep-seat-map-v1'
const STORAGE_KEY = 'markhall-seat-map-v2'
const DEFAULT_PROFILE: StudentProfile = { board: 'all', grade: '10' }

export function StudentApp({ user }: { user: { email: string; name: string } }) {
  const [profile, setProfile] = useState<StudentProfile>(DEFAULT_PROFILE)
  const [subjects, setSubjects] = useState<Subject[]>(defaultSubjects)
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  const [screen, setScreen] = useState<Screen>('dashboard')
  const [setupTarget, setSetupTarget] = useState<SeatTarget | null>(null)
  const [result, setResult] = useState<SessionResult | null>(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      try {
        const raw =
          window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_STORAGE_KEY)
        if (raw) {
          const stored = JSON.parse(raw) as Partial<StoredState> & {
            profile?: Partial<StudentProfile>
            session?: Partial<Session> | null
          }
          if (Array.isArray(stored.subjects)) {
            const storedProfile: StudentProfile = {
              board: stored.profile?.board ?? DEFAULT_PROFILE.board,
              grade: stored.profile?.grade ?? DEFAULT_PROFILE.grade,
            }
            setSubjects(stored.subjects)
            setProfile(storedProfile)
            setActiveSession(
              stored.session
                ? {
                    ...(stored.session as Session),
                    board: stored.session.board ?? storedProfile.board,
                    grade: stored.session.grade ?? storedProfile.grade,
                  }
                : null,
            )
          }
        }
      } catch {
        window.localStorage.removeItem(STORAGE_KEY)
      } finally {
        if (!cancelled) setHydrated(true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!hydrated) return
    const stored: StoredState = { version: 2, profile, subjects, session: activeSession }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
    } catch {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  }, [profile, subjects, activeSession, hydrated])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [screen])

  const current = currentSeat(subjects)
  const coverage = overallCoverage(subjects)
  const sessionSubject = activeSession ? subjects.find((subject) => subject.id === activeSession.subjectId) : undefined
  const sessionChapter = activeSession
    ? sessionSubject?.chapters.find((chapter) => chapter.id === activeSession.chapterId)
    : undefined

  function goDashboard() {
    setScreen('dashboard')
  }

  function openSetup(target: SeatTarget) {
    setSetupTarget(target)
    setScreen('setup')
  }

  function openPractice() {
    if (activeSession) {
      setScreen('practice')
      return
    }
    const target = current
      ? { subjectId: current.subject.id, chapterId: current.chapter.id }
      : { subjectId: subjects[0].id, chapterId: subjects[0].chapters[0].id }
    openSetup(target)
  }

  function beginSession(values: SessionSetupValues) {
    const questions = sessionQuestions(values.subjectId, values.chapterId)
    const session: Session = {
      id: `session-${Date.now()}`,
      subjectId: values.subjectId,
      chapterId: values.chapterId,
      board: values.board,
      grade: values.grade,
      mode: values.mode,
      minutes: values.minutes,
      startedAt: new Date().toISOString(),
      questionIds: questions.map((question) => question.id),
      answers: {},
      drafts: {},
      currentIndex: 0,
    }

    setProfile({ board: values.board, grade: values.grade })
    setSubjects((previous) =>
      previous.map((subject) => ({
        ...subject,
        chapters: subject.chapters.map((chapter) => {
          if (subject.id === values.subjectId && chapter.id === values.chapterId) {
            return { ...chapter, state: 'in-progress' }
          }
          if (chapter.state === 'in-progress') return { ...chapter, state: 'not-started' as const }
          return chapter
        }),
      })),
    )
    setActiveSession(session)
    setResult(null)
    setScreen('practice')
  }

  function updateDraft(questionId: string, value: string) {
    setActiveSession((previous) =>
      previous ? { ...previous, drafts: { ...previous.drafts, [questionId]: value } } : previous,
    )
  }

  function recordAnswer(record: AnswerRecord) {
    setActiveSession((previous) =>
      previous ? { ...previous, answers: { ...previous.answers, [record.questionId]: record } } : previous,
    )
  }

  function retryQuestion(questionId: string) {
    setActiveSession((previous) => {
      if (!previous) return previous
      const answers = { ...previous.answers }
      delete answers[questionId]
      return { ...previous, answers }
    })
  }

  function nextQuestion() {
    setActiveSession((previous) =>
      previous
        ? {
            ...previous,
            currentIndex: Math.min(previous.questionIds.length - 1, previous.currentIndex + 1),
          }
        : previous,
    )
  }

  function finishSession() {
    if (!activeSession) return
    const questions = questionsForSession(activeSession)
    const total = questions.reduce((sum, question) => sum + question.marks, 0)
    const awarded = questions.reduce((sum, question) => sum + (activeSession.answers[question.id]?.awarded ?? 0), 0)
    const ratio = total === 0 ? 0 : awarded / total
    const passed = ratio >= 0.6
    const normalized = Math.round(ratio * 10)

    const subject = subjects.find((item) => item.id === activeSession.subjectId)
    const chapterIndex = subject?.chapters.findIndex((chapter) => chapter.id === activeSession.chapterId) ?? -1
    let nextChapterId: string | null = null
    if (subject && chapterIndex >= 0) {
      const ordered = [...subject.chapters.slice(chapterIndex + 1), ...subject.chapters.slice(0, chapterIndex)]
      const nextChapter = ordered.find(
        (chapter) => chapter.id !== activeSession.chapterId && chapter.state !== 'present',
      )
      nextChapterId = nextChapter?.id ?? null
    }

    setSubjects((previous) =>
      previous.map((item) => {
        if (item.id !== activeSession.subjectId) return item
        return {
          ...item,
          chapters: item.chapters.map((chapter) =>
            chapter.id === activeSession.chapterId
              ? {
                  ...chapter,
                  state: passed ? ('present' as const) : ('weak' as const),
                  lastScore: normalized,
                  marksLost: 10 - normalized,
                }
              : chapter,
          ),
        }
      }),
    )

    setResult({
      session: activeSession,
      awarded,
      total,
      nextChapterId,
      completedAt: new Date().toISOString(),
    })
    setActiveSession(null)
    setScreen('summary')
  }

  function discardSession() {
    setActiveSession(null)
    setSubjects((previous) =>
      previous.map((subject) => ({
        ...subject,
        chapters: subject.chapters.map((chapter) =>
          chapter.state === 'in-progress' ? { ...chapter, state: 'not-started' as const } : chapter,
        ),
      })),
    )
    setScreen('dashboard')
  }

  return (
    <AppShell
      active={screen === 'dashboard' ? 'dashboard' : 'practice'}
      board={boardLabel(profile.board)}
      coveragePercent={coverage.percent}
      grade={profile.grade}
      onDashboard={goDashboard}
      onPractice={openPractice}
      sessionActive={Boolean(activeSession)}
      user={user}
    >
      {screen === 'dashboard' && (
        <Dashboard
          onDiscard={discardSession}
          onResume={() => setScreen('practice')}
          onStart={openSetup}
          session={activeSession}
          subjects={subjects}
        />
      )}

      {screen === 'setup' && (
        <SessionSetup
          initialBoard={profile.board}
          initialGrade={profile.grade}
          initialTarget={setupTarget}
          onBegin={beginSession}
          onCancel={goDashboard}
          subjects={subjects}
        />
      )}

      {screen === 'practice' && activeSession && sessionSubject && sessionChapter && (
        <Practice
          chapterName={sessionChapter.name}
          onAnswer={recordAnswer}
          onDraftChange={updateDraft}
          onFinish={finishSession}
          onNext={nextQuestion}
          onRetry={retryQuestion}
          onSaveExit={goDashboard}
          questions={questionsForSession(activeSession)}
          session={activeSession}
          subjectName={sessionSubject.name}
        />
      )}

      {screen === 'practice' && (!activeSession || !sessionSubject || !sessionChapter) && (
        <main className="main-column">
          <p className="rail-empty">That session is no longer on the roll. Start a new one from the dashboard.</p>
          <button className="button button-primary" onClick={goDashboard} type="button">
            Back to dashboard
          </button>
        </main>
      )}

      {screen === 'summary' && result && (
        <SessionSummary
          onDone={goDashboard}
          onStartNext={openSetup}
          questions={questionsForSession(result.session)}
          result={result}
          subjects={subjects}
        />
      )}
    </AppShell>
  )
}
