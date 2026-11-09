'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function ReingestButton({ id }: { id?: number | string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  if (id === undefined) return null

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          setPending(true)
          setError('')
          const response = await fetch(`/api/source-documents/${id}/reingest`, {
            method: 'POST',
            credentials: 'include',
          })
          setPending(false)

          if (!response.ok) {
            setError('Could not queue this document.')
            return
          }

          router.refresh()
        }}
      >
        {pending ? 'Queueing...' : 'Re-ingest'}
      </button>
      {error ? <p>{error}</p> : null}
    </div>
  )
}

export default ReingestButton
