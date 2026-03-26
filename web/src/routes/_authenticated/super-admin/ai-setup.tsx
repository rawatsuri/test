import { Link, createFileRoute } from '@tanstack/react-router'
import { useTenants } from '@/hooks/tenants/use-tenants'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const Route = createFileRoute('/_authenticated/super-admin/ai-setup')({
  component: SuperAdminAiSetupPage,
})

function SuperAdminAiSetupPage() {
  const tenantsQuery = useTenants()
  const tenants = tenantsQuery.data ?? []

  return (
    <div className='space-y-6'>
      <section>
        <h1 className='text-3xl font-semibold tracking-tight'>AI Setup</h1>
        <p className='text-sm text-muted-foreground'>
          Configure AI provider stack, model behavior, and prompt strategy per tenant.
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Tenant AI Configuration</CardTitle>
          <CardDescription>
            Open a tenant setup page and manage AI settings under
            {' '}
            <span className='font-medium'>Tenant Setup: AI Agent</span>
            .
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-2'>
          {tenantsQuery.isLoading ? <p className='text-sm text-muted-foreground'>Loading tenants...</p> : null}
          {tenants.map((tenant) => (
            <div key={tenant.id} className='flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3'>
              <div className='space-y-1'>
                <p className='text-sm font-medium'>{tenant.name}</p>
                <p className='text-xs text-muted-foreground'>{tenant.slug}</p>
              </div>
              <div className='flex items-center gap-2'>
                <Badge variant='outline'>{tenant.industry}</Badge>
                <Badge>{tenant.status}</Badge>
                <Button asChild size='sm'>
                  <Link to='/super-admin/tenants/$tenantId' params={{ tenantId: tenant.id }}>
                    Configure AI
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
