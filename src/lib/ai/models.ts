import type { Embeddings } from '@langchain/core/embeddings'
import type { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai'

import { env } from '@/lib/env'

export type ModelRole = 'router' | 'solver' | 'explainer' | 'judge' | 'vision'

const models = new Map<ModelRole, BaseChatModel>()
let embedder: Embeddings | undefined

function assertOpenAICompatible(provider: string) {
  if (provider !== 'openai' && provider !== 'openai-compatible') {
    throw new Error(`Unsupported provider "${provider}". Add an adapter in src/lib/ai/models.ts.`)
  }
}

export function getModel(role: ModelRole): BaseChatModel {
  const cached = models.get(role)
  if (cached) return cached

  assertOpenAICompatible(env.llmProvider)
  if (!env.llmApiKey) throw new Error('LLM_API_KEY or OPENAI_API_KEY is required to call a model.')
  const model = new ChatOpenAI({
    model: env.models[role],
    apiKey: env.llmApiKey,
    configuration: env.llmBaseUrl ? { baseURL: env.llmBaseUrl } : undefined,
  })
  models.set(role, model)
  return model
}

export function getEmbedder(): Embeddings {
  if (embedder) return embedder

  assertOpenAICompatible(env.embeddingProvider)
  if (!env.embeddingApiKey) {
    throw new Error('EMBEDDING_API_KEY, LLM_API_KEY or OPENAI_API_KEY is required to embed content.')
  }
  embedder = new OpenAIEmbeddings({
    model: env.embeddingModel,
    dimensions: env.embeddingDimension,
    apiKey: env.embeddingApiKey,
    configuration: env.embeddingBaseUrl ? { baseURL: env.embeddingBaseUrl } : undefined,
  })
  return embedder
}
