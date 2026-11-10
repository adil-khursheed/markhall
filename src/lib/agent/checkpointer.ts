import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres'
import { Pool } from 'pg'

import { env } from '@/lib/env'

let handle: { saver: PostgresSaver; pool: Pool } | undefined

export async function getCheckpointer() {
  if (!handle) {
    const pool = new Pool({ connectionString: env.databaseUrl })
    const saver = new PostgresSaver(pool)
    await saver.setup()
    handle = { saver, pool }
  }
  return handle.saver
}

export async function closeCheckpointer() {
  await handle?.pool.end()
  handle = undefined
}
