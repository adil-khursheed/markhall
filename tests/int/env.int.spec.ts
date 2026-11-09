import { afterEach, describe, expect, it, vi } from 'vitest'

import { assertEnv, env } from '@/lib/env'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('assertEnv', () => {
  it('fails when core env is missing', () => {
    vi.stubEnv('DATABASE_URL', '')
    vi.stubEnv('PAYLOAD_SECRET', '')
    expect(() => assertEnv()).toThrow(/Missing required environment variables/)
  })

  it('accepts valid core env', () => {
    vi.stubEnv('DATABASE_URL', 'postgres://user:pass@localhost:5432/db')
    vi.stubEnv('PAYLOAD_SECRET', 'secret')
    expect(() => assertEnv()).not.toThrow()
  })

  it('rejects a non-integer dimension', () => {
    vi.stubEnv('DATABASE_URL', 'postgres://user:pass@localhost:5432/db')
    vi.stubEnv('PAYLOAD_SECRET', 'secret')
    vi.stubEnv('EMBEDDING_DIMENSION', 'many')
    expect(() => assertEnv()).toThrow(/EMBEDDING_DIMENSION/)
  })

  it('uses the Phase 2 model and embedding baseline when env is unset', () => {
    vi.stubEnv('MODEL_DEFAULT', '')
    vi.stubEnv('MODEL_ROUTER', '')
    vi.stubEnv('MODEL_SOLVER', '')
    vi.stubEnv('MODEL_EXPLAINER', '')
    vi.stubEnv('MODEL_JUDGE', '')
    vi.stubEnv('MODEL_VISION', '')
    vi.stubEnv('EMBEDDING_MODEL', '')

    expect(env.models).toEqual({
      router: 'gpt-5.6-luna',
      solver: 'gpt-5.4-mini',
      explainer: 'gpt-5.4-mini',
      judge: 'gpt-5.4-mini',
      vision: 'gpt-5.4-mini',
    })
    expect(env.embeddingModel).toBe('text-embedding-3-large')
  })

  it('lets embeddings use separate credentials and base URL', () => {
    vi.stubEnv('LLM_API_KEY', 'chat-key')
    vi.stubEnv('LLM_BASE_URL', 'https://chat.example/v1')
    vi.stubEnv('EMBEDDING_API_KEY', 'embed-key')
    vi.stubEnv('EMBEDDING_BASE_URL', 'https://embed.example/v1')

    expect(env.embeddingApiKey).toBe('embed-key')
    expect(env.embeddingBaseUrl).toBe('https://embed.example/v1')

    vi.stubEnv('EMBEDDING_API_KEY', '')
    vi.stubEnv('EMBEDDING_BASE_URL', '')
    expect(env.embeddingApiKey).toBe('chat-key')
    expect(env.embeddingBaseUrl).toBe('https://chat.example/v1')
  })
})
