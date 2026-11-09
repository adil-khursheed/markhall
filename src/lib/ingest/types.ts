export type KnowledgeKind = 'concept' | 'formula' | 'example' | 'definition'
export type QuestionType = 'mcq' | 'short' | 'long' | 'numeric'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type OptionLabel = 'A' | 'B' | 'C' | 'D'

export type KnowledgeItem = {
  kind: KnowledgeKind
  content: string
  pageRange: string
  contentHash: string
  chapterId?: number | string
}

export type QuestionItem = {
  stem: string
  type: QuestionType
  options?: { label: OptionLabel; text: string }[]
  marks: number
  solution?: string
  finalAnswer?: string
  needsFigure?: boolean
  pageRange: string
  contentHash: string
  chapterId?: number | string
  difficulty?: Difficulty
  status?: 'draft' | 'in_review'
  reviewNotes?: string
  verification?: {
    status: 'ok' | 'mismatch' | 'skipped' | 'unavailable'
    detail?: string
  }
}

export type IngestScratch = {
  knowledge: KnowledgeItem[]
  questions: QuestionItem[]
}
