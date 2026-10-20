import { useEffect, useState } from 'react'
import type { AppView, NavigationTarget } from '@/types'

const knownViews = new Set<AppView>([
  'dashboard', 'learn', 'bank', 'practice', 'exam', 'final', 'wrong', 'stats', 'cards', 'sources', 'settings',
])

const parseHash = (): NavigationTarget => {
  const raw = window.location.hash.replace(/^#\/?/, '')
  const [path = 'dashboard', query = ''] = raw.split('?')
  const [maybeView, id] = path.split('/').map(decodeURIComponent)
  const view = knownViews.has(maybeView as AppView) ? (maybeView as AppView) : 'dashboard'
  return { view, id, params: Object.fromEntries(new URLSearchParams(query)) }
}

export const useNavigation = () => {
  const [target, setTarget] = useState<NavigationTarget>(parseHash)
  useEffect(() => {
    const onHashChange = () => setTarget(parseHash())
    window.addEventListener('hashchange', onHashChange)
    if (!window.location.hash) window.history.replaceState(null, '', '#/dashboard')
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const navigate = (next: NavigationTarget) => {
    const id = next.id ? `/${encodeURIComponent(next.id)}` : ''
    const query = next.params ? new URLSearchParams(next.params).toString() : ''
    window.location.hash = `/${next.view}${id}${query ? `?${query}` : ''}`
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  return { target, navigate }
}
