import { onValue, ref } from 'firebase/database'
import { useEffect, useState } from 'react'
import { database } from '../lib/firebase'

type RealtimeState<T> = {
  data: T | null
  loading: boolean
  error: Error | null
}

export function useRealtimeValue<T>(
  path: string,
  enabled = true,
): RealtimeState<T> {
  const [state, setState] = useState<RealtimeState<T>>({
    data: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    if (!enabled) {
      return
    }

    return onValue(
      path ? ref(database, path) : ref(database),
      (snapshot) => {
        setState({
          data: snapshot.val() as T | null,
          loading: false,
          error: null,
        })
      },
      (error) => {
        setState({
          data: null,
          loading: false,
          error,
        })
      },
    )
  }, [enabled, path])

  return enabled ? state : { data: null, loading: false, error: null }
}
