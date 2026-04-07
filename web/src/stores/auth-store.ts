import { create } from 'zustand'
import { getCookie, setCookie, removeCookie } from '@/lib/cookies'

export const ACCESS_TOKEN_COOKIE = 'omni_frontend_access_token'
export const AUTH_USER_COOKIE = 'omni_frontend_auth_user'

interface AuthUser {
  accountNo: string
  email: string
  role: string[]
  exp: number
}

interface AuthState {
  auth: {
    user: AuthUser | null
    setUser: (user: AuthUser | null) => void
    accessToken: string
    setAccessToken: (accessToken: string) => void
    resetAccessToken: () => void
    reset: () => void
  }
}

export const useAuthStore = create<AuthState>()((set) => {
  const cookieState = getCookie(ACCESS_TOKEN_COOKIE)
  const userState = getCookie(AUTH_USER_COOKIE)
  let initToken = ''
  let initUser: AuthUser | null = null
  if (cookieState) {
    try {
      const parsed = JSON.parse(cookieState)
      initToken = typeof parsed === 'string' ? parsed : ''
    } catch {
      initToken = cookieState
    }
  }
  if (userState) {
    try {
      const parsed = JSON.parse(userState)
      initUser = parsed && typeof parsed === 'object' ? (parsed as AuthUser) : null
    } catch {
      initUser = null
    }
  }
  return {
    auth: {
      user: initUser,
      setUser: (user) =>
        set((state) => {
          if (user) {
            setCookie(AUTH_USER_COOKIE, JSON.stringify(user))
          } else {
            removeCookie(AUTH_USER_COOKIE)
          }
          return { ...state, auth: { ...state.auth, user } }
        }),
      accessToken: initToken,
      setAccessToken: (accessToken) =>
        set((state) => {
          setCookie(ACCESS_TOKEN_COOKIE, JSON.stringify(accessToken))
          return { ...state, auth: { ...state.auth, accessToken } }
        }),
      resetAccessToken: () =>
        set((state) => {
          removeCookie(ACCESS_TOKEN_COOKIE)
          return { ...state, auth: { ...state.auth, accessToken: '' } }
        }),
      reset: () =>
        set((state) => {
          removeCookie(ACCESS_TOKEN_COOKIE)
          removeCookie(AUTH_USER_COOKIE)
          return {
            ...state,
            auth: { ...state.auth, user: null, accessToken: '' },
          }
        }),
    },
  }
})
