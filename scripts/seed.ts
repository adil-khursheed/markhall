import 'dotenv/config'

import { getPayload } from 'payload'

import config from '../src/payload.config'

const payload = await getPayload({ config: await config })

const adminEmail = process.env.SEED_ADMIN_EMAIL
const adminPassword = process.env.SEED_ADMIN_PASSWORD

if (adminEmail && adminPassword) {
  const { docs } = await payload.find({
    collection: 'users',
    where: { email: { equals: adminEmail } },
    limit: 1,
    overrideAccess: true,
  })

  if (docs.length === 0) {
    await payload.create({
      collection: 'users',
      data: {
        email: adminEmail,
        name: 'Markhall admin',
        password: adminPassword,
        role: 'admin',
      },
      overrideAccess: true,
    })
    console.log(`Created admin ${adminEmail}`)
  }
}

const { docs: existingSubjects } = await payload.find({
  collection: 'subjects',
  where: {
    and: [
      { board: { equals: 'cbse' } },
      { classLevel: { equals: 10 } },
      { code: { equals: 'SCI' } },
    ],
  },
  limit: 1,
  overrideAccess: true,
})

const subjectData = {
  board: 'cbse' as const,
  classLevel: 10,
  name: 'Science',
  code: 'SCI',
  academicYear: '2025-26',
}

const subject = existingSubjects[0]
  ? await payload.update({
      collection: 'subjects',
      id: existingSubjects[0].id,
      data: subjectData,
      overrideAccess: true,
    })
  : await payload.create({ collection: 'subjects', data: subjectData, overrideAccess: true })

const { docs: existingChapters } = await payload.find({
  collection: 'chapters',
  where: {
    and: [{ subject: { equals: subject.id } }, { number: { equals: 1 } }],
  },
  limit: 1,
  overrideAccess: true,
})

const chapterData = {
  subject: subject.id,
  number: 1,
  title: 'Chemical reactions and equations',
  weightageMarks: 6,
}

const chapter = existingChapters[0]
  ? await payload.update({
      collection: 'chapters',
      id: existingChapters[0].id,
      data: chapterData,
      overrideAccess: true,
    })
  : await payload.create({ collection: 'chapters', data: chapterData, overrideAccess: true })

const questions = [
  {
    stem: 'Which gas is released when zinc reacts with dilute hydrochloric acid?',
    finalAnswer: 'B',
    options: [
      { label: 'A' as const, text: 'Oxygen' },
      { label: 'B' as const, text: 'Hydrogen' },
      { label: 'C' as const, text: 'Carbon dioxide' },
      { label: 'D' as const, text: 'Nitrogen' },
    ],
  },
  {
    stem: 'What is the pH of a neutral solution at 25 C?',
    finalAnswer: 'C',
    options: [
      { label: 'A' as const, text: '0' },
      { label: 'B' as const, text: '5' },
      { label: 'C' as const, text: '7' },
      { label: 'D' as const, text: '14' },
    ],
  },
]

const seededQuestions = []

for (const question of questions) {
  const { docs } = await payload.find({
    collection: 'question-bank',
    where: { stem: { equals: question.stem } },
    limit: 1,
    overrideAccess: true,
  })

  const data = {
    stem: question.stem,
    type: 'mcq' as const,
    options: question.options,
    marks: 1,
    difficulty: 'easy' as const,
    board: 'cbse' as const,
    classLevel: 10,
    subject: subject.id,
    chapter: chapter.id,
    language: 'en' as const,
    canonicalSolution: `The correct answer is ${question.finalAnswer}.`,
    finalAnswer: question.finalAnswer,
    verification: { seeded: true },
    origin: 'generated' as const,
    status: 'published' as const,
  }

  const doc = docs[0]
    ? await payload.update({
        collection: 'question-bank',
        id: docs[0].id,
        data,
        overrideAccess: true,
      })
    : await payload.create({ collection: 'question-bank', data, overrideAccess: true })

  seededQuestions.push(doc)
}

const { docs: existingTests } = await payload.find({
  collection: 'mock-tests',
  where: { title: { equals: 'Science quick check' } },
  limit: 1,
  overrideAccess: true,
})

const testData = {
  title: 'Science quick check',
  board: 'cbse' as const,
  classLevel: 10,
  subject: subject.id,
  durationMinutes: 20,
  totalMarks: seededQuestions.length,
  negativeMarking: 0,
  sections: [
    {
      name: 'Section A',
      instructions: 'Choose one option for each question.',
      questions: seededQuestions.map((question) => question.id),
      marksEach: 1,
    },
  ],
  blueprintSnapshot: { seeded: true },
  status: 'published' as const,
}

const mockTest = existingTests[0]
  ? await payload.update({
      collection: 'mock-tests',
      id: existingTests[0].id,
      data: testData,
      overrideAccess: true,
    })
  : await payload.create({ collection: 'mock-tests', data: testData, overrideAccess: true })

console.log(
  `Seeded ${subject.name}, chapter ${chapter.title}, ${seededQuestions.length} questions, and ${mockTest.title}.`,
)

process.exit(0)
