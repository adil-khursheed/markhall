import { Annotation, MessagesAnnotation } from '@langchain/langgraph'

import type { User } from '@/payload-types'

export type TutorMode = 'doubt' | 'generate' | 'clarify' | 'refuse'

export type StudentProfile = {
  id: number
  board: string
  classLevel: number
  language: string
}

export type SyllabusHit = {
  id: number
  content: string
  chapterId?: number
  blueprint?: unknown
  score: number
}

export type SimilarQuestion = {
  id: number
  stem: string
  score: number
}

export type MasteryHit = {
  chapterId: number
  mastery: number
}

export type TutorContext = {
  syllabus: SyllabusHit[]
  similar: SimilarQuestion[]
  mastery: MasteryHit[]
  blueprint?: unknown
}

export type ComputedValue = {
  latex: string
  num?: number | null
}

export type Computation = {
  plan?: string
  script?: string
  values?: Record<string, ComputedValue>
  ok: boolean
  attempts: number
  error?: string
}

export type Validation = {
  ok: boolean
  errors: string[]
  attempts: number
}

export type ImageAttachment = {
  uploadId: number
  kind: 'student_solution' | 'textbook_question' | 'other'
  text: string
  confidence: number
}

export type CompareResult = {
  ok: boolean
  /** 1-based index of the first step that breaks the chain; -1 when all agree. */
  firstBadStep: number
  error?: string
}

export type TutorRequest = {
  text: string
  subjectId?: number
  chapterId?: number
  uploads?: number[]
}

export const TutorState = Annotation.Root({
  ...MessagesAnnotation.spec,
  student: Annotation<StudentProfile>(),
  mode: Annotation<TutorMode>(),
  request: Annotation<TutorRequest>(),
  context: Annotation<TutorContext>(),
  computation: Annotation<Computation>(),
  draft: Annotation<string>(),
  validation: Annotation<Validation>(),
  flagged: Annotation<boolean>(),
  images: Annotation<ImageAttachment[]>(),
  compare: Annotation<CompareResult | undefined>(),
})

export function profileOf(user: User): StudentProfile {
  if (!user.board || !user.classLevel) {
    throw new Error('Set board and classLevel on the profile before using the tutor.')
  }
  return {
    id: user.id,
    board: user.board,
    classLevel: user.classLevel,
    language: user.preferredLanguage ?? 'en',
  }
}

export function emptyContext(): TutorContext {
  return { syllabus: [], similar: [], mastery: [] }
}

export function emptyComputation(): Computation {
  return { ok: false, attempts: 0 }
}

export function emptyValidation(): Validation {
  return { ok: false, errors: [], attempts: 0 }
}
