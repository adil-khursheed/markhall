export type SeatState = 'not-started' | 'in-progress' | 'present' | 'weak'

export type SessionMode = 'practice' | 'revise' | 'test'

export type Question = {
  id: string
  prompt: string
  marks: number
  keywords: string[]
  modelPoints: string[]
}

export type Chapter = {
  id: string
  name: string
  state: SeatState
  lastScore?: number
  marksLost?: number
}

export type Subject = {
  id: string
  name: string
  code: string
  chapters: Chapter[]
}

export type AnswerRecord = {
  questionId: string
  answer: string
  awarded: number
  total: number
  note: string
  modelPoints: string[]
  checkedAt: string
}

export type Session = {
  id: string
  subjectId: string
  chapterId: string
  board: string
  grade: string
  mode: SessionMode
  minutes: number
  startedAt: string
  questionIds: string[]
  answers: Record<string, AnswerRecord>
  drafts: Record<string, string>
  currentIndex: number
}

export type SessionSetupValues = {
  subjectId: string
  chapterId: string
  board: string
  grade: string
  mode: SessionMode
  minutes: number
}

export type StudentProfile = {
  board: string
  grade: string
}

export type SessionResult = {
  session: Session
  awarded: number
  total: number
  nextChapterId: string | null
  completedAt: string
}

export type SeatTarget = {
  subjectId: string
  chapterId: string
}
