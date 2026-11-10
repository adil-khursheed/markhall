import { z } from 'zod'

import { env } from '@/lib/env'

const valueSchema = z.object({
  latex: z.string(),
  num: z.number().nullable().optional(),
})

const responseSchema = z.object({
  ok: z.boolean(),
  stdout: z.string(),
  stderr: z.string(),
  exitCode: z.number(),
  timedOut: z.boolean().optional(),
  values: z.record(z.string(), valueSchema).nullable().optional(),
  error: z.string().nullable().optional(),
})

export type SandboxRun = z.infer<typeof responseSchema>

export async function runPython(input: {
  script: string
  user: string
  timeoutMs?: number
}): Promise<SandboxRun> {
  const timeoutMs = Math.min(input.timeoutMs ?? env.sandboxTimeoutMs, env.sandboxTimeoutMs)
  const response = await fetch(`${env.sandboxUrl.replace(/\/$/, '')}/runPython`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ script: input.script, timeout: timeoutMs / 1000, user: input.user }),
    signal: AbortSignal.timeout(timeoutMs + 1000),
  })

  if (!response.ok) {
    return {
      ok: false,
      stdout: '',
      stderr: '',
      exitCode: response.status,
      error: `Sandbox returned HTTP ${response.status}`,
    }
  }

  return responseSchema.parse(await response.json())
}
