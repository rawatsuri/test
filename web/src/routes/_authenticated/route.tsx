import { createFileRoute } from '@tanstack/react-router'
import { requireAuthenticated } from '@/lib/auth'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ context, location }) => {
    requireAuthenticated(context.auth, location.href)
  },
  component: AuthenticatedLayout,
})
