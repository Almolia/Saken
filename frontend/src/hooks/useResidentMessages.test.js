import { describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useResidentMessages } from './useResidentMessages'

const conversation = {
  id: 4,
  subject: 'نشتی سقف',
  counterpart_label: 'مدیریت ساختمان',
  last_message_preview: 'سقف واحد چکه می‌کند',
  last_message_at: '2026-08-17T10:00:00Z',
  unread_count: 2,
}

describe('useResidentMessages', () => {
  it('loads the resident inbox newest-first payload', async () => {
    const fetchConversations = vi.fn().mockResolvedValue({
      conversations: [conversation],
      unread_total: 2,
    })
    const { result } = renderHook(() => useResidentMessages(fetchConversations))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.conversations).toEqual([conversation])
    expect(result.current.unreadTotal).toBe(2)
  })

  it('puts a newly sent conversation at the top', async () => {
    const fetchConversations = vi.fn().mockResolvedValue({ conversations: [], unread_total: 0 })
    const { result } = renderHook(() => useResidentMessages(fetchConversations))

    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => result.current.upsertConversation(conversation))

    expect(result.current.conversations).toEqual([conversation])
    expect(result.current.unreadTotal).toBe(2)
  })
})
