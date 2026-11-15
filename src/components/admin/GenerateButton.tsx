'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function GenerateButton({ id }: { id?: number | string }) {
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
          const response = await fetch(`/api/chapters/${id}/generate?count=5`, {
            method: 'POST',
            credentials: 'include',
          })
          setPending(false)

          if (!response.ok) {
            setError('Could not queue generation.')
            return
          }

          router.refresh()
        }}
      >
        {pending ? 'Queueing...' : 'Generate questions'}
      </button>
      {error ? <p>{error}</p> : null}
    </div>
  )
}

export default GenerateButton
