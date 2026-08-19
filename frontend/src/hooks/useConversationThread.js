import { useEffect, useState } from 'react'

export function useConversationThread({ conversationId, fetchThread, markRead, onMarkedRead }) {
  const [thread, setThread] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!conversationId) return undefined

    let active = true
    fetchThread(conversationId)
      .then(async (data) => {
        if (!active) return
        setThread(data?.conversation || data)
        setError('')
        try {
          await markRead?.(conversationId)
          if (active) onMarkedRead?.(conversationId)
        } catch {
          // Opening the thread still works if the receipt write fails.
        }
      })
      .catch((loadError) => {
        if (!active) return
        setThread(null)
        setError(loadError.message || 'خطایی در دریافت گفتگو رخ داد.')
      })

    return () => {
      active = false
    }
  }, [conversationId, fetchThread, markRead, onMarkedRead])

  const matchesSelection = thread?.id === conversationId
  return {
    thread: conversationId && matchesSelection ? thread : null,
    loading: Boolean(conversationId) && !matchesSelection && !error,
    error: conversationId ? error : '',
    replaceThread: setThread,
  }
}
