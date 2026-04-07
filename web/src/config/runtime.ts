type FrontendAuthMode = 'mock' | 'clerk'
type FrontendDataMode = 'mock' | 'api'

function normalizeAuthMode(value: string | undefined): FrontendAuthMode {
  return value === 'clerk' ? 'clerk' : 'mock'
}

function normalizeDataMode(value: string | undefined): FrontendDataMode {
  return value === 'api' ? 'api' : 'mock'
}

const legacyUseMockData = import.meta.env.VITE_USE_MOCK_DATA

export const frontendAuthMode = normalizeAuthMode(import.meta.env.VITE_AUTH_MODE)
export const frontendDataMode = normalizeDataMode(
  import.meta.env.VITE_DATA_MODE ??
    (legacyUseMockData === 'false' ? 'api' : undefined)
)

export const isMockAuthMode = frontendAuthMode === 'mock'
export const isClerkAuthMode = frontendAuthMode === 'clerk'
export const isMockDataMode = frontendDataMode === 'mock'
export const isApiDataMode = frontendDataMode === 'api'

export function describeFrontendRuntime() {
  return {
    authMode: frontendAuthMode,
    dataMode: frontendDataMode,
  }
}
