import 'dotenv/config'

import { getEmbedder, getModel } from '../src/lib/ai/models'
import { env } from '../src/lib/env'

async function main() {
  if (!env.llmApiKey) {
    console.log('Skipped: set LLM_API_KEY or OPENAI_API_KEY to run the provider smoke test.')
    return
  }

  const reply = await getModel('router').invoke('Reply with the single word: ok')
  console.log('chat:', typeof reply.content === 'string' ? reply.content : JSON.stringify(reply.content))

  try {
    const structured = await getModel('router')
      .withStructuredOutput({
        type: 'object',
        properties: { ok: { type: 'boolean' } },
        required: ['ok'],
        additionalProperties: false,
      })
      .invoke('Return the object with ok set to true.')
    console.log('structured:', JSON.stringify(structured))
  } catch (error) {
    console.warn('structured output skipped:', error instanceof Error ? error.message : error)
  }

  const vector = await getEmbedder().embedQuery('Markhall smoke test')
  console.log('embedding dimensions:', vector.length)
  if (vector.length !== env.embeddingDimension) {
    throw new Error(`Expected ${env.embeddingDimension} dimensions, got ${vector.length}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
