import 'dotenv/config'

import { getPayload } from 'payload'

import config from '../src/payload.config'
import { runTutor } from '../src/lib/agent'
import { closeCheckpointer } from '../src/lib/agent/checkpointer'
import { goldenDoubts } from '../src/lib/agent/golden'
import { env } from '../src/lib/env'
import { numbersMatch } from '../src/lib/ingest/verify'

async function main() {
  if (!env.llmApiKey) {
    console.log('Skipped: set LLM_API_KEY or OPENAI_API_KEY to run the golden-doubt evaluation.')
    return
  }

  const payload = await getPayload({ config: await config })
  const stamp = Date.now()

  const user =
    (
      await payload.find({
        collection: 'users',
        where: { email: { equals: 'golden-eval@markhall.test' } },
        limit: 1,
        overrideAccess: true,
      })
    ).docs[0] ??
    (await payload.create({
      collection: 'users',
      data: {
        email: 'golden-eval@markhall.test',
        password: `golden-${stamp}`,
        name: 'Golden eval student',
        role: 'student',
        board: 'cbse',
        classLevel: 10,
        preferredLanguage: 'en',
      },
      overrideAccess: true,
    }))

  const subject =
    (
      await payload.find({
        collection: 'subjects',
        where: { code: { equals: 'GOLDEN' } },
        limit: 1,
        overrideAccess: true,
      })
    ).docs[0] ??
    (await payload.create({
      collection: 'subjects',
      data: {
        board: 'cbse',
        classLevel: 10,
        name: 'Golden evaluation',
        code: 'GOLDEN',
        academicYear: '2025-26',
      },
      overrideAccess: true,
    }))

  const chapter =
    (
      await payload.find({
        collection: 'chapters',
        where: { subject: { equals: subject.id }, number: { equals: 1 } },
        limit: 1,
        overrideAccess: true,
      })
    ).docs[0] ??
    (await payload.create({
      collection: 'chapters',
      data: { subject: subject.id, number: 1, title: 'Mixed revision' },
      overrideAccess: true,
    }))

  console.log('Seeded golden fixtures.')

  let passed = 0
  const threads: number[] = []

  try {
    for (const item of goldenDoubts) {
      const thread = await payload.create({
        collection: 'doubt-threads',
        data: { user: user.id, messages: [] },
        overrideAccess: true,
      })
      threads.push(thread.id)

      console.log(`CASE ${item.id}`)

      try {
        const result = await runTutor({
          payload,
          user,
          threadId: thread.id,
          text: item.question,
          chapterId: chapter.id,
        })

        const values = Object.values(result.computation.values ?? {})
        const answerOk = values.some(
          (value) =>
            typeof value.num === 'number' &&
            numbersMatch(item.expected, value.num),
        )
        const ok = result.computation.ok && result.validation.ok && answerOk
        if (ok) passed += 1

        const actual = values.map((value) => value.num).filter((value) => value != null)
        console.log(
          `${ok ? 'PASS' : 'FAIL'} ${item.id}: expected ${item.expected}, got [${actual.join(', ')}], validated=${result.validation.ok}`,
        )
      } catch (error) {
        console.log(
          `FAIL ${item.id}: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    }
  } finally {
    for (const id of threads) {
      await payload.delete({ collection: 'doubt-threads', id, overrideAccess: true }).catch(() => undefined)
    }
    await closeCheckpointer()
  }

  console.log(`Golden doubts: ${passed}/${goldenDoubts.length} passed.`)
  process.exit(passed === goldenDoubts.length ? 0 : 1)
}

await main()
