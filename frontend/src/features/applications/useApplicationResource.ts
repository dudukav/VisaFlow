import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { AuthRejected } from '../../api/client'

type Resource<T> =
  { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: T }

type ApplicationOutlet = { onAuthRejected: () => void }

export function useApplicationResource<T>(
  read: (signal: AbortSignal) => Promise<T>,
) {
  const { onAuthRejected } = useOutletContext<ApplicationOutlet>()
  const [resource, setResource] = useState<Resource<T>>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller

    async function load() {
      // StrictMode can dispose of the initial effect before its request needs to start.
      await Promise.resolve()
      if (signal.aborted) return

      try {
        const data = await read(signal)
        if (!signal.aborted) setResource({ status: 'ready', data })
      } catch (error) {
        if (signal.aborted) return
        if (error instanceof AuthRejected) {
          onAuthRejected()
          return
        }
        setResource({ status: 'error' })
      }
    }

    void load()
    return () => controller.abort()
  }, [attempt, onAuthRejected, read])

  function retry() {
    setResource({ status: 'loading' })
    setAttempt((current) => current + 1)
  }

  return { resource, retry, onAuthRejected }
}
