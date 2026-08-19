import { request } from './api'

export const managerMessageApi = {
  list() {
    return request('/manager/messages/')
  },
  broadcast(payload) {
    return request('/manager/messages/broadcast/', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  thread(conversationId) {
    return request(`/manager/messages/${conversationId}/`)
  },
  reply(conversationId, payload) {
    return request(`/manager/messages/${conversationId}/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  markRead(conversationId) {
    return request(`/manager/messages/${conversationId}/read/`, {
      method: 'POST',
    })
  },
}

export const residentMessageApi = {
  list() {
    return request('/resident/messages/')
  },
  create(payload) {
    return request('/resident/messages/', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  thread(conversationId) {
    return request(`/resident/messages/${conversationId}/`)
  },
  reply(conversationId, payload) {
    return request(`/resident/messages/${conversationId}/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  markRead(conversationId) {
    return request(`/resident/messages/${conversationId}/read/`, {
      method: 'POST',
    })
  },
  unreadCount() {
    return request('/resident/messages/unread_count/')
  },
}

export function normalizeConversations(data) {
  if (Array.isArray(data?.conversations)) return data.conversations
  if (Array.isArray(data)) return data
  return []
}

export function unreadTotalFrom(data, conversations = normalizeConversations(data)) {
  if (typeof data?.unread_total === 'number') return data.unread_total
  if (typeof data?.unread_count === 'number') return data.unread_count
  return conversations.reduce((sum, item) => sum + (Number(item.unread_count) || 0), 0)
}
