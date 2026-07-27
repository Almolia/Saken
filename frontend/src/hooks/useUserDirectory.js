import { useCallback, useEffect, useState } from 'react'
import { useToast } from '../components/ToastProvider'
import { managerApi } from '../lib/api'
import { UserRole } from '../utils/constants'

function buildStats(users) {
  return {
    total: users.length,
    managers: users.filter((user) => user.role === UserRole.MANAGER).length,
    residents: users.filter((user) => user.role === UserRole.RESIDENT).length,
    service_staff: users.filter((user) => user.role === UserRole.SERVICE_STAFF).length,
  }
}

// Shared by the admin and manager panels: both list users and may change roles.
export function useUserDirectory() {
  const { showToast } = useToast()
  const [data, setData] = useState({ users: [], stats: null, loading: true, error: '' })
  const [actionState, setActionState] = useState({})

  useEffect(() => {
    let active = true
    managerApi
      .users()
      .then((response) => active && setData({ users: response.users, stats: response.stats, loading: false, error: '' }))
      .catch((error) => active && setData((current) => ({ ...current, loading: false, error: error.message })))
    return () => {
      active = false
    }
  }, [])

  const changeRole = useCallback(
    async (user, role) => {
      if (role === user.role) return
      setActionState((current) => ({ ...current, [`role-${user.id}`]: true }))
      try {
        const response = await managerApi.updateUserRole(user.id, { role })
        setData((current) => {
          const users = current.users.map((item) => (item.id === user.id ? response.user : item))
          return { ...current, users, stats: buildStats(users) }
        })
        showToast(response.message)
      } catch (error) {
        showToast(error.message, 'error')
      } finally {
        setActionState((current) => ({ ...current, [`role-${user.id}`]: false }))
      }
    },
    [showToast],
  )

  return { data, setData, actionState, changeRole }
}
