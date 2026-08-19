import { describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useManagerMessages } from './useManagerMessages'

const newer = {
  id: 2,
  subject: 'قطع آب',
  resident_name: 'ساکن ب',
  last_message_preview: 'فردا آب قطع است',
  last_message_at: '2026-08-17T10:00:00Z',
  unread_count: 1,
}

const older = {
  id: 1,
  subject: 'سوال شارژ',
  resident_name: 'ساکن الف',
  last_message_preview: 'مهلت پرداخت کی است؟',
  last_message_at: '2026-08-16T10:00:00Z',
  unread_count: 2,
}

describe('useManagerMessages', () => {
  it('starts in the loading state', () => {
    const fetchConversations = vi.fn(() => new Promise(() => {}))
    const { result } = renderHook(() => useManagerMessages(fetchConversations))

    expect(result.current.loading).toBe(true)
    expect(result.current.conversations).toEqual([])
  })

  it('reads the wrapped inbox payload', async () => {
    const fetchConversations = vi.fn().mockResolvedValue({
      conversations: [newer, older],
      unread_total: 3,
    })
    const { result } = renderHook(() => useManagerMessages(fetchConversations))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.conversations).toEqual([newer, older])
    expect(result.current.unreadTotal).toBe(3)
  })

  it('surfaces a failed load and re-reads on retry', async () => {
    const fetchConversations = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('خطایی در ارتباط با سرور رخ داد.'), { status: 500 }))
      .mockResolvedValueOnce({ conversations: [newer], unread_total: 1 })
    const { result } = renderHook(() => useManagerMessages(fetchConversations))

    await waitFor(() => expect(result.current.error).toBe('خطایی در ارتباط با سرور رخ داد.'))

    act(() => result.current.retry())
    await waitFor(() => expect(result.current.conversations).toEqual([newer]))
    expect(result.current.error).toBe('')
  })

  it('upserts broadcasted conversations at the top', async () => {
    const fetchConversations = vi.fn().mockResolvedValue({ conversations: [older], unread_total: 2 })
    const { result } = renderHook(() => useManagerMessages(fetchConversations))

    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => result.current.upsertConversations([newer]))

    expect(result.current.conversations.map((item) => item.id)).toEqual([2, 1])
    expect(result.current.unreadTotal).toBe(3)
  })

  it('clears unread for a conversation the manager just opened', async () => {
    const fetchConversations = vi.fn().mockResolvedValue({ conversations: [newer, older], unread_total: 3 })
    const { result } = renderHook(() => useManagerMessages(fetchConversations))

    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => result.current.markConversationRead(1))

    expect(result.current.conversations.find((item) => item.id === 1).unread_count).toBe(0)
    expect(result.current.unreadTotal).toBe(1)
  })
})
