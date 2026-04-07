import { useState, type FormEvent } from 'react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { getPostLoginTarget } from '@/lib/auth'
import { describeFrontendRuntime } from '@/config/runtime'
import { platformService } from '@/lib/platform-service'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const demoAccounts = [
  { role: 'Super Admin', email: 'owner@aivoice.ai', password: 'Pass@123' },
  { role: 'Tenant Owner', email: 'owner@sunlight-pediatrics.ai', password: 'Pass@123' },
  { role: 'Tenant Admin', email: 'admin@sunlight-pediatrics.ai', password: 'Pass@123' },
  { role: 'Tenant Member', email: 'member@sunlight-pediatrics.ai', password: 'Pass@123' },
]

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : '/',
  }),
  beforeLoad: ({ context, search }) => {
    if (context.auth.isAuthenticated) {
      if (search.redirect && search.redirect !== '/') {
        throw redirect({ to: search.redirect })
      }

      const target = getPostLoginTarget(context.auth)
      throw redirect({ to: target.to, params: target.params })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const { auth } = useAuthStore()
  const runtime = describeFrontendRuntime()
  const { redirect: redirectTarget } = Route.useSearch()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fillDemoAccount = (account: (typeof demoAccounts)[number]) => {
    setEmail(account.email)
    setPassword(account.password)
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!email.trim() || !password.trim()) {
      toast.error('Email and password are required')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await platformService.login(email.trim(), password)
      auth.setAccessToken(result.token)
      auth.setUser(result.user)

      if (redirectTarget && redirectTarget !== '/') {
        window.location.assign(redirectTarget)
      } else if (result.user.role.includes('SUPER_ADMIN')) {
        navigate({ to: '/super-admin/dashboard' })
      } else {
        navigate({
          to: '/tenant/$tenantId/dashboard',
          params: { tenantId: result.user.accountNo },
        })
      }
    } catch (error) {
      toast.error((error as Error).message || 'Login failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className='mx-auto flex min-h-svh w-full max-w-xl items-center px-6 py-10'>
      <Card className='w-full'>
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>
            Local runtime: auth={runtime.authMode}, data={runtime.dataMode}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className='space-y-4' onSubmit={onSubmit}>
            <div className='space-y-1'>
              <Label>Email</Label>
              <Input
                type='email'
                autoComplete='email'
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className='space-y-1'>
              <Label>Password</Label>
              <Input
                type='password'
                autoComplete='current-password'
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <Button className='w-full' type='submit' disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <div className='mt-4 space-y-2 text-xs text-muted-foreground'>
            <p>
              Demo password: <span className='font-medium'>Pass@123</span>
            </p>
            <div className='rounded-xl border border-border/70 bg-muted/25 p-3'>
              <p className='mb-2 font-medium text-foreground'>Seeded demo accounts</p>
              <div className='grid gap-2'>
                {demoAccounts.map((account) => (
                  <button
                    key={account.email}
                    type='button'
                    onClick={() => fillDemoAccount(account)}
                    className='flex w-full items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/80 px-3 py-2 text-left transition hover:border-primary/40 hover:bg-primary/5'
                  >
                    <span className='font-medium text-foreground'>{account.role}</span>
                    <span className='text-right font-medium'>{account.email}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
