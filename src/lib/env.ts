const text = (name: string) => process.env[name]?.trim() || undefined

const required = (name: string) => {
  const value = text(name)
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

const optional = (name: string, fallback = '') => text(name) ?? fallback

const integer = (name: string, fallback: number) => {
  const value = text(name)
  if (!value) return fallback
  const parsed = Number(value)
  if (!Number.isInteger(parsed)) throw new Error(`${name} must be an integer`)
  return parsed
}

const boolean = (name: string, fallback: boolean) => {
  const value = text(name)?.toLowerCase()
  if (!value) return fallback
  if (['1', 'true', 'yes', 'on'].includes(value)) return true
  if (['0', 'false', 'no', 'off'].includes(value)) return false
  throw new Error(`${name} must be true or false`)
}

const defaultModels = {
  router: 'gpt-5.6-luna',
  solver: 'gpt-5.4-mini',
  explainer: 'gpt-5.4-mini',
  judge: 'gpt-5.4-mini',
  vision: 'gpt-5.4-mini',
} as const

const defaultModel = (role: keyof typeof defaultModels) =>
  optional('MODEL_DEFAULT', defaultModels[role])

export const env = {
  get nodeEnv() {
    return optional('NODE_ENV', 'development')
  },
  get databaseUrl() {
    return required('DATABASE_URL')
  },
  get payloadSecret() {
    return required('PAYLOAD_SECRET')
  },
  get cookiePrefix() {
    return optional('PAYLOAD_COOKIE_PREFIX', 'payload')
  },
  get llmProvider() {
    return optional('LLM_PROVIDER', 'openai')
  },
  get llmApiKey() {
    return text('LLM_API_KEY') ?? text('OPENAI_API_KEY') ?? ''
  },
  get llmBaseUrl() {
    return text('LLM_BASE_URL') ?? text('OPENAI_BASE_URL') ?? ''
  },
  get models() {
    return {
      router: optional('MODEL_ROUTER', defaultModel('router')),
      solver: optional('MODEL_SOLVER', defaultModel('solver')),
      explainer: optional('MODEL_EXPLAINER', defaultModel('explainer')),
      judge: optional('MODEL_JUDGE', defaultModel('judge')),
      vision: optional('MODEL_VISION', defaultModel('vision')),
    }
  },
  get embeddingProvider() {
    return optional('EMBEDDING_PROVIDER', 'openai')
  },
  get embeddingApiKey() {
    return text('EMBEDDING_API_KEY') ?? env.llmApiKey
  },
  get embeddingBaseUrl() {
    return text('EMBEDDING_BASE_URL') ?? env.llmBaseUrl
  },
  get embeddingModel() {
    return optional('EMBEDDING_MODEL', 'text-embedding-3-large')
  },
  get embeddingDimension() {
    return integer('EMBEDDING_DIMENSION', 1024)
  },
  get sandboxUrl() {
    return optional('SANDBOX_URL', 'http://sandbox:8000')
  },
  get sandboxTimeoutMs() {
    return integer('SANDBOX_TIMEOUT_MS', 10_000)
  },
  get redisUrl() {
    return optional('REDIS_URL', 'redis://redis:6379')
  },
  get jobsAutoRun() {
    return boolean('JOBS_AUTORUN', false)
  },
  get uploadsDir() {
    return optional('UPLOADS_DIR', './uploads')
  },
}

export function assertEnv() {
  const missing = ['DATABASE_URL', 'PAYLOAD_SECRET'].filter((name) => !text(name))
  if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(', ')}`)

  new URL(env.databaseUrl)
  new URL(env.sandboxUrl)
  new URL(env.redisUrl)
  if (env.embeddingDimension < 1) throw new Error('EMBEDDING_DIMENSION must be positive')
  if (env.sandboxTimeoutMs < 1) throw new Error('SANDBOX_TIMEOUT_MS must be positive')
}
