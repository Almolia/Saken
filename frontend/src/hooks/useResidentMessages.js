import { useCallback, useEffect, useMemo, useState } from 'react'
import { normalizeConversations, residentMessageApi, unreadTotalFrom } from '../lib/messagingApi'

export function useResidentMessages(fetchConversations = residentMessageApi.list) {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState({
    conversations: [],
    unreadTotal: 0,
    loading: true,
    error: '',
  })

  useEffect(() => {
    let active = true

    fetchConversations()
      .then((data) => {
        if (!active) return
        const conversations = normalizeConversations(data)
        setState({
          conversations,
          unreadTotal: unreadTotalFrom(data, conversations),
          loading: false,
          error: '',
        })
      })
      .catch((error) => {
        if (!active) return
        setState((current) => ({
          ...current,
          loading: false,
          error: error.message || 'خطایی در دریافت پیام‌ها رخ داد.',
        }))
      })

    return () => {
      active = false
    }
  }, [fetchConversations, attempt])

  const retry = useCallback(() => {
    setState((current) => ({ ...current, loading: true, error: '' }))
    setAttempt((current) => current + 1)
  }, [])

  const upsertConversation = useCallback((conversation) => {
    if (!conversation) return
    setState((current) => {
      const conversations = [
        conversation,
        ...current.conversations.filter((item) => item.id !== conversation.id),
      ].sort((left, right) => {
        const leftTime = new Date(left.last_message_at || 0).getTime()
        const rightTime = new Date(right.last_message_at || 0).getTime()
        return rightTime - leftTime
      })
      return {
        ...current,
        conversations,
        unreadTotal: conversations.reduce((sum, item) => sum + (Number(item.unread_count) || 0), 0),
      }
    })
  }, [])

  const markConversationRead = useCallback((conversationId) => {
    setState((current) => {
      const conversations = current.conversations.map((item) =>
        item.id === conversationId ? { ...item, unread_count: 0 } : item,
      )
      return {
        ...current,
        conversations,
        unreadTotal: conversations.reduce((sum, item) => sum + (Number(item.unread_count) || 0), 0),
      }
    })
  }, [])

  const totalUnread = useMemo(
    () => state.conversations.reduce((sum, item) => sum + (Number(item.unread_count) || 0), 0),
    [state.conversations],
  )

  return {
    ...state,
    unreadTotal: totalUnread,
    retry,
    upsertConversation,
    markConversationRead,
  }
}
