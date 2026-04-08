import { useLocation } from '@tanstack/react-router'
import { getNavigationContext } from '@/lib/navigation-context'

export function useAppNavigation() {
  const pathname = useLocation({ select: (location) => location.pathname })

  return getNavigationContext(pathname)
}
