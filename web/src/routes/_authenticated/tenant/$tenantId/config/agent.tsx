import { Link, createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const Route = createFileRoute('/_authenticated/tenant/$tenantId/config/agent')({
  component: TenantAgentConfigDisabledPage,
})

function TenantAgentConfigDisabledPage() {
  const { tenantId } = Route.useParams()

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Agent Configuration Locked</CardTitle>
        <CardDescription>
          AI model, providers, and core agent setup are controlled by super admin only.
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-2 text-sm text-muted-foreground'>
        <p>
          Client admins can manage operations, callers, knowledge, channels, and team, but not base
          AI provider setup.
        </p>
        <p>
          Ask super admin to configure this in tenant setup under
          {' '}
          <Link
            className='font-medium text-primary underline-offset-4 hover:underline'
            to='/super-admin/tenants/$tenantId'
            params={{ tenantId }}
          >
            Super Admin Tenant Detail
          </Link>
          .
        </p>
      </CardContent>
    </Card>
  )
}
