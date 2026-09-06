import { useEffect } from 'react'

// Per-page <title> for SEO/UX. Base title stays "LogicRush"; pages append their name.
export function useTitle(title?: string): void {
  useEffect(() => {
    document.title = title !== undefined && title !== '' ? `${title} — LogicRush` : 'LogicRush'
    return () => { document.title = 'LogicRush' }
  }, [title])
}
