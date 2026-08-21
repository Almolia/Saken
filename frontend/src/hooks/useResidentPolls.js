import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { residentPollApi } from '../lib/pollApi'
import { pendingVoteCount, sortResidentPolls } from '../utils/polls'

function normalizePolls(data) {
  if (Array.isArray(data?.polls)) return data.polls
  if (Array.isArray(data?.results)) return data.results
  if (Array.isArray(data)) return data
  return []
}

/**
 * The polls this resident may answer.
 *
 * The endpoint does the narrowing — Active, still open, and either
 * building-wide or aimed at a unit they own — so there is nothing to filter
 * here. Everything it returns belongs on screen.
 */
export function useResidentPolls() {
  const hasLoaded = useRef(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [state, setState] = useState({
    polls: [],
    loading: true,
    refreshing: false,
    error: '',
  })

  useEffect(() => {
    let active = true
    // A manual refresh keeps the cards on screen and only spins the refresh
    // button; the full-height loader belongs to the first read.
    const isInitialLoad = !hasLoaded.current

    setState((current) => ({
      ...current,
      loading: isInitialLoad,
      refreshing: !isInitialLoad,
      error: '',
    }))

    residentPollApi
      .list()
      .then((data) => {
        if (!active) return
        hasLoaded.current = true
        setState({
          polls: sortResidentPolls(normalizePolls(data)),
          loading: false,
          refreshing: false,
          error: '',
        })
      })
      .catch((error) => {
        if (!active) return
        setState((current) => ({
          ...current,
          loading: false,
          refreshing: false,
          error: error.message || 'خطایی در دریافت نظرسنجی‌ها رخ داد.',
        }))
      })

    return () => {
      active = false
    }
  }, [reloadKey])

  const refresh = useCallback(() => {
    setReloadKey((current) => current + 1)
  }, [])

  /**
   * Records the vote the server just accepted.
   *
   * The vote endpoint answers with a message and nothing else, so the card is
   * updated from what was sent rather than refetching the whole list — the
   * resident sees their answer land immediately, and the one fact that changed
   * is the one that gets written.
   */
  const markVoted = useCallback((pollId, optionId) => {
    setState((current) => ({
      ...current,
      polls: current.polls.map((poll) =>
        poll.id === pollId ? { ...poll, has_voted: true, selected_option_id: optionId } : poll,
      ),
    }))
  }, [])

  const pendingCount = useMemo(() => pendingVoteCount(state.polls), [state.polls])

  return { ...state, pendingCount, refresh, markVoted }
}
