import { useState, type FormEvent } from 'react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { platformService } from '@/lib/platform-service'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const Route = createFileRoute('/login')({
  beforeLoad: () => {
    const token = useAuthStore.getState().auth.accessToken
    if (token) {
      throw redirect({ to: '/' })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const { auth } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

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

      if (result.user.role.includes('SUPER_ADMIN')) {
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
            Sign in with your own account credentials.
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

          <p className='mt-4 text-xs text-muted-foreground'>
            Mock login password: <span className='font-medium'>Pass@123</span>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
