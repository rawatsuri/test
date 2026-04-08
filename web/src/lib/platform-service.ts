import { api } from '@/lib/api'
import { describeFrontendRuntime, isMockAuthMode, isMockDataMode } from '@/config/runtime'
import { unwrapApiData, type ApiEnvelope } from '@/lib/api-response'
import {
  CallDirection,
  CallStatus,
  Industry,
  Plan,
  Provider,
  Speaker,
  TenantStatus,
  UserRole,
  type AgentConfig,
  type Call,
  type Caller,
  type BookingOrder,
  type CreateKnowledgeRequest,
  type CreatePhoneNumberRequest,
  type CreateTenantRequest,
  type CreateUserRequest,
  type KnowledgeItem,
  type OmnichannelAutomation,
  type OmnichannelChannel,
  type OmnichannelConversation,
  type PhoneNumber,
  type Tenant,
  type UpdateAgentConfigRequest,
  type UpdateKnowledgeRequest,
  type UpdatePhoneNumberRequest,
  type UpdateTenantRequest,
  type UpdateUserRequest,
  type User,
} from '@/types'

type Pagination = {
  page: number
  limit: number
  total: number
  totalPages: number
}

type MockDb = {
  tenants: Tenant[]
  users: User[]
  phoneNumbers: PhoneNumber[]
  callers: Caller[]
  calls: Call[]
  agentConfigs: AgentConfig[]
  knowledgeItems: KnowledgeItem[]
  conversations: OmnichannelConversation[]
  channels: OmnichannelChannel[]
  automations: OmnichannelAutomation[]
  bookingOrders: BookingOrder[]
}

const STORAGE_KEY = 'omni_frontend_mock_db_v1'

function requireMockData(feature: string): never {
  const { authMode, dataMode } = describeFrontendRuntime()
  throw new Error(
    `${feature} is only available in mock data mode. Current frontend runtime: auth=${authMode}, data=${dataMode}.`
  )
}

function id(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

function nowIso() {
  return new Date().toISOString()
}

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

function toNumber(value: string | undefined, fallback: number) {
  if (!value) return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function paginate<T>(items: T[], page = 1, limit = 20) {
  const safePage = Math.max(1, page)
  const safeLimit = Math.max(1, limit)
  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / safeLimit))
  const start = (safePage - 1) * safeLimit
  return {
    data: items.slice(start, start + safeLimit),
    pagination: { page: safePage, limit: safeLimit, total, totalPages },
  }
}

function envelope<T>(data: T, pagination?: Pagination): ApiEnvelope<T> {
  return { success: true, data, ...(pagination ? { pagination } : {}) }
}

function createSeedDb(): MockDb {
  const tenants: Tenant[] = [
    {
      id: 'tenant_healthcare_alpha',
      name: 'Alpha Care Clinic',
      slug: 'alpha-care-clinic',
      industry: Industry.HEALTHCARE,
      status: TenantStatus.ACTIVE,
      plan: Plan.PROFESSIONAL,
      createdAt: daysAgo(80),
      updatedAt: daysAgo(1),
      dataRetentionDays: 15,
      saveCallRecordings: true,
    },
    {
      id: 'tenant_restro_spice',
      name: 'Spice Route Kitchen',
      slug: 'spice-route-kitchen',
      industry: Industry.RESTAURANT,
      status: TenantStatus.ACTIVE,
      plan: Plan.STARTER,
      createdAt: daysAgo(50),
      updatedAt: daysAgo(2),
      dataRetentionDays: 30,
      saveCallRecordings: false,
    },
  ]

  const phoneNumbers: PhoneNumber[] = []
  const callers: Caller[] = []
  const calls: Call[] = []
  const users: User[] = []
  const agentConfigs: AgentConfig[] = []
  const knowledgeItems: KnowledgeItem[] = []
  const conversations: OmnichannelConversation[] = []
  const channels: OmnichannelChannel[] = []
  const automations: OmnichannelAutomation[] = []
  const bookingOrders: BookingOrder[] = []

  for (const [tenantIndex, tenant] of tenants.entries()) {
    const lineA: PhoneNumber = {
      id: id('num'),
      number: `+91990${tenantIndex}00100`,
      provider: Provider.EXOTEL,
      tenantId: tenant.id,
      label: 'Main Line',
      isActive: true,
      createdAt: daysAgo(30),
    }
    const lineB: PhoneNumber = {
      id: id('num'),
      number: `+91990${tenantIndex}00200`,
      provider: Provider.PLIVO,
      tenantId: tenant.id,
      label: 'Support',
      isActive: true,
      createdAt: daysAgo(20),
    }
    phoneNumbers.push(lineA, lineB)

    users.push(
      {
        id: id('user'),
        email: `owner@${tenant.slug}.com`,
        name: 'Workspace Owner',
        role: UserRole.OWNER,
        tenantId: tenant.id,
        createdAt: daysAgo(40),
        updatedAt: daysAgo(2),
      },
      {
        id: id('user'),
        email: `admin@${tenant.slug}.com`,
        name: 'Sub Admin',
        role: UserRole.ADMIN,
        tenantId: tenant.id,
        createdAt: daysAgo(18),
        updatedAt: daysAgo(1),
      },
    )

    agentConfigs.push({
      id: id('cfg'),
      tenantId: tenant.id,
      systemPrompt: `You are the AI assistant for ${tenant.name}.`,
      voiceId: null,
      language: 'en-IN',
      sttProvider: 'DEEPGRAM',
      ttsProvider: 'ELEVEN_LABS',
      llmProvider: 'OPENAI',
      telephonyProvider: 'EXOTEL',
      providerApiKeys: null,
      maxCallDuration: 300,
      greeting: `Welcome to ${tenant.name}`,
      fallbackMessage: 'Connecting you to a human assistant.',
      enableMemory: true,
      enableExtraction: true,
      enableRecording: false,
      extractionSchemas: { fields: ['intent', 'urgency'] },
      createdAt: daysAgo(30),
      updatedAt: daysAgo(1),
    })

    knowledgeItems.push(
      {
        id: id('k'),
        tenantId: tenant.id,
        title: 'Working Hours',
        content: 'Mon-Sat, 9 AM to 8 PM.',
        category: 'operations',
        createdAt: daysAgo(10),
        updatedAt: daysAgo(10),
      },
      {
        id: id('k'),
        tenantId: tenant.id,
        title: 'Escalation Policy',
        content: 'Escalate urgent issues to on-call admin in 5 minutes.',
        category: 'policy',
        createdAt: daysAgo(7),
        updatedAt: daysAgo(2),
      },
    )

    for (let idx = 0; idx < 10; idx++) {
      const caller: Caller = {
        id: id('caller'),
        tenantId: tenant.id,
        phoneNumber: `+9188${tenantIndex}0${String(idx).padStart(2, '0')}1212`,
        name: idx % 3 === 0 ? null : `Customer ${idx + 1}`,
        email: idx % 4 === 0 ? null : `customer${idx + 1}@mail.com`,
        preferences: { language: idx % 2 === 0 ? 'en-IN' : 'hi-IN' },
        metadata: { source: idx % 2 === 0 ? 'voice' : 'whatsapp' },
        firstCallAt: daysAgo(35 - idx),
        lastCallAt: daysAgo(Math.max(1, 12 - idx)),
        totalCalls: 1 + (idx % 5),
        isSaved: idx % 4 === 0,
        expiresAt: idx % 4 === 0 ? null : daysAgo(-14),
      }
      callers.push(caller)

      for (let cIdx = 0; cIdx < Math.min(3, caller.totalCalls); cIdx++) {
        const startedAt = daysAgo(10 - cIdx)
        const durationSecs = 45 + cIdx * 45
        const call: Call = {
          id: id('call'),
          externalId: id('ext'),
          tenantId: tenant.id,
          phoneNumberId: lineA.id,
          callerId: caller.id,
          direction: cIdx % 3 === 0 ? CallDirection.OUTBOUND : CallDirection.INBOUND,
          status: cIdx % 4 === 0 ? CallStatus.TRANSFERRED : CallStatus.COMPLETED,
          startedAt,
          answeredAt: startedAt,
          endedAt: new Date(new Date(startedAt).getTime() + durationSecs * 1000).toISOString(),
          durationSecs,
          summary: 'Customer inquiry handled by AI with fallback checks.',
          sentiment: cIdx % 2 === 0 ? 'POSITIVE' : 'NEUTRAL',
          transcripts: [
            {
              id: id('tr'),
              callId: '',
              role: Speaker.AGENT,
              content: 'Hello, this is your AI assistant. How can I help today?',
              timestamp: startedAt,
              confidence: 0.99,
            },
            {
              id: id('tr'),
              callId: '',
              role: Speaker.CALLER,
              content: 'I need details for booking and pricing.',
              timestamp: startedAt,
              confidence: 0.97,
            },
          ],
          extractions: [
            {
              id: id('extx'),
              callId: '',
              type: 'intent',
              data: { intent: 'booking_inquiry' },
              confidence: 0.91,
              createdAt: startedAt,
            },
          ],
          recordings: [
            {
              id: id('rec'),
              callId: '',
              url: '/mock/recordings/sample-call.wav',
              format: 'wav',
              sizeBytes: 2048,
              createdAt: startedAt,
            },
          ],
        }
        call.transcripts?.forEach((item) => (item.callId = call.id))
        call.extractions?.forEach((item) => (item.callId = call.id))
        call.recordings?.forEach((item) => (item.callId = call.id))
        calls.push(call)
      }
    }

    conversations.push(
      {
        id: id('conv'),
        tenantId: tenant.id,
        channel: 'WHATSAPP',
        customerName: 'Ravi Kumar',
        customerContact: '+919801112233',
        status: 'OPEN',
        priority: 'HIGH',
        summary: 'Requested urgent callback and pricing details.',
        assignedTo: 'Sub Admin',
        lastMessageAt: nowIso(),
        unreadCount: 3,
      },
      {
        id: id('conv'),
        tenantId: tenant.id,
        channel: 'WEB_CHAT',
        customerName: 'Priya Shah',
        customerContact: 'priya@example.com',
        status: 'AI_HANDLED',
        priority: 'MEDIUM',
        summary: 'AI shared onboarding flow and collected contact details.',
        assignedTo: null,
        lastMessageAt: daysAgo(1),
        unreadCount: 0,
      },
      {
        id: id('conv'),
        tenantId: tenant.id,
        channel: 'VOICE',
        customerName: 'Unknown Caller',
        customerContact: '+918877665544',
        status: 'ESCALATED',
        priority: 'HIGH',
        summary: 'Requested human transfer after complaint.',
        assignedTo: 'Workspace Owner',
        lastMessageAt: nowIso(),
        unreadCount: 1,
      },
    )

    channels.push(
      {
        id: id('chn'),
        tenantId: tenant.id,
        type: 'VOICE',
        provider: 'EXOTEL',
        isActive: true,
        health: 'HEALTHY',
        aiEnabled: true,
        humanFallback: true,
        slaTargetMins: 3,
        updatedAt: nowIso(),
      },
      {
        id: id('chn'),
        tenantId: tenant.id,
        type: 'WHATSAPP',
        provider: 'META',
        isActive: true,
        health: 'HEALTHY',
        aiEnabled: true,
        humanFallback: true,
        slaTargetMins: 5,
        updatedAt: nowIso(),
      },
      {
        id: id('chn'),
        tenantId: tenant.id,
        type: 'WEB_CHAT',
        provider: 'INTERNAL',
        isActive: true,
        health: 'DEGRADED',
        aiEnabled: true,
        humanFallback: true,
        slaTargetMins: 2,
        updatedAt: nowIso(),
      },
    )

    automations.push(
      {
        id: id('auto'),
        tenantId: tenant.id,
        name: 'Lead Qualification',
        trigger: 'New WhatsApp inquiry',
        description: 'Capture lead profile and schedule callback slot.',
        status: 'ACTIVE',
        runCount: 42,
        lastRunAt: daysAgo(0),
        createdAt: daysAgo(25),
        updatedAt: daysAgo(1),
      },
      {
        id: id('auto'),
        tenantId: tenant.id,
        name: 'Missed Call Follow-up',
        trigger: 'No answer after call',
        description: 'Send callback confirmation and escalate if unanswered.',
        status: 'ACTIVE',
        runCount: 18,
        lastRunAt: daysAgo(0),
        createdAt: daysAgo(18),
        updatedAt: daysAgo(2),
      },
    )

    bookingOrders.push(
      {
        id: id('bo'),
        tenantId: tenant.id,
        type: 'BOOKING',
        status: 'NEW',
        customerName: 'Ananya Sharma',
        customerPhone: '+919876543210',
        channel: 'WHATSAPP',
        amount: null,
        itemSummary: tenant.industry === Industry.RESTAURANT ? 'Table for 4 at 8:30 PM' : 'Doctor consultation slot',
        scheduledAt: daysAgo(-2),
        notes: 'First-time customer',
        createdAt: daysAgo(1),
        updatedAt: daysAgo(1),
      },
      {
        id: id('bo'),
        tenantId: tenant.id,
        type: 'ORDER',
        status: 'CONFIRMED',
        customerName: 'Rahul Verma',
        customerPhone: '+919812340987',
        channel: 'VOICE',
        amount: 1299,
        itemSummary: tenant.industry === Industry.RESTAURANT ? '2 thalis + 1 dessert' : 'Service package order',
        scheduledAt: null,
        notes: 'Paid via UPI',
        createdAt: daysAgo(2),
        updatedAt: daysAgo(1),
      },
      {
        id: id('bo'),
        tenantId: tenant.id,
        type: 'BOOKING',
        status: 'COMPLETED',
        customerName: 'Neha Gupta',
        customerPhone: '+919800112233',
        channel: 'WEB_CHAT',
        amount: tenant.industry === Industry.RESTAURANT ? 0 : 500,
        itemSummary: tenant.industry === Industry.RESTAURANT ? 'Lunch reservation completed' : 'Follow-up session completed',
        scheduledAt: daysAgo(-1),
        notes: null,
        createdAt: daysAgo(4),
        updatedAt: daysAgo(0),
      },
    )
  }

  return {
    tenants,
    users,
    phoneNumbers,
    callers,
    calls,
    agentConfigs,
    knowledgeItems,
    conversations,
    channels,
    automations,
    bookingOrders,
  }
}

function loadDb(): MockDb {
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    const seeded = createSeedDb()
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded))
    return seeded
  }
  try {
    return JSON.parse(raw) as MockDb
  } catch {
    const seeded = createSeedDb()
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded))
    return seeded
  }
}

function persistDb(db: MockDb) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
}

function withDb<T>(mutator: (db: MockDb) => T) {
  const db = loadDb()
  const result = mutator(db)
  persistDb(db)
  return result
}

function listMockCalls(tenantId: string, filters?: Record<string, string>) {
  const db = loadDb()
  let calls = db.calls.filter((item) => item.tenantId === tenantId)
  if (filters?.status) calls = calls.filter((item) => item.status === filters.status)
  if (filters?.from) calls = calls.filter((item) => +new Date(item.startedAt) >= +new Date(filters.from!))
  if (filters?.to) calls = calls.filter((item) => +new Date(item.startedAt) <= +new Date(filters.to!))

  const hydrated = calls
    .sort((a, b) => +new Date(b.startedAt) - +new Date(a.startedAt))
    .map((call) => ({
      ...call,
      caller: db.callers.find((item) => item.id === call.callerId),
      phoneNumber: db.phoneNumbers.find((item) => item.id === call.phoneNumberId),
    }))

  const { data, pagination } = paginate(hydrated, toNumber(filters?.page, 1), toNumber(filters?.limit, 20))
  return envelope(data, pagination)
}

function getMockCall(tenantId: string, callId: string) {
  const db = loadDb()
  const call = db.calls.find((item) => item.tenantId === tenantId && item.id === callId)
  if (!call) throw new Error('Call not found')
  return envelope({
    ...call,
    caller: db.callers.find((item) => item.id === call.callerId),
    phoneNumber: db.phoneNumbers.find((item) => item.id === call.phoneNumberId),
  })
}

function listMockCallers(tenantId: string, filters?: Record<string, string>) {
  const db = loadDb()
  let callers = db.callers.filter((item) => item.tenantId === tenantId)
  if (filters?.search) {
    const q = filters.search.toLowerCase()
    callers = callers.filter((item) =>
      `${item.name ?? ''} ${item.email ?? ''} ${item.phoneNumber}`.toLowerCase().includes(q),
    )
  }
  if (filters?.isSaved === 'true') callers = callers.filter((item) => item.isSaved)
  if (filters?.isSaved === 'false') callers = callers.filter((item) => !item.isSaved)

  callers.sort((a, b) => +new Date(b.lastCallAt) - +new Date(a.lastCallAt))
  const { data, pagination } = paginate(callers, toNumber(filters?.page, 1), toNumber(filters?.limit, 20))
  return envelope(data, pagination)
}

function getMockCaller(tenantId: string, callerId: string) {
  const db = loadDb()
  const caller = db.callers.find((item) => item.tenantId === tenantId && item.id === callerId)
  if (!caller) throw new Error('Caller not found')
  const calls = db.calls
    .filter((item) => item.callerId === caller.id)
    .sort((a, b) => +new Date(b.startedAt) - +new Date(a.startedAt))
    .slice(0, 10)
  return envelope({ ...caller, calls })
}

function listMockBookingOrders(tenantId: string, filters?: Record<string, string>) {
  const db = loadDb()
  let rows = db.bookingOrders.filter((item) => item.tenantId === tenantId)
  if (filters?.type && filters.type !== 'ALL') rows = rows.filter((item) => item.type === filters.type)
  if (filters?.status && filters.status !== 'ALL') rows = rows.filter((item) => item.status === filters.status)
  if (filters?.search) {
    const q = filters.search.toLowerCase()
    rows = rows.filter((item) =>
      `${item.customerName} ${item.customerPhone} ${item.itemSummary}`.toLowerCase().includes(q),
    )
  }

  rows.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
  const { data, pagination } = paginate(rows, toNumber(filters?.page, 1), toNumber(filters?.limit, 20))
  return envelope(data, pagination)
}

export const platformService = {
  async getTenants() {
    if (isMockDataMode) return envelope(loadDb().tenants.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)))
    const response = await api.get<ApiEnvelope<Tenant[]>>('/v1/tenants')
    return response.data
  },
  async getTenant(tenantId: string) {
    if (isMockDataMode) {
      const tenant = loadDb().tenants.find((item) => item.id === tenantId)
      if (!tenant) throw new Error('Tenant not found')
      return envelope(tenant)
    }
    const response = await api.get<ApiEnvelope<Tenant>>(`/v1/tenants/${tenantId}`)
    return response.data
  },
  async createTenant(payload: CreateTenantRequest) {
    if (isMockDataMode) {
      return withDb((db) => {
        const exists = db.tenants.some((item) => item.slug === payload.slug)
        if (exists) throw new Error('Tenant slug already exists')
        const now = nowIso()
        const tenant: Tenant = {
          id: id('tenant'),
          name: payload.name,
          slug: payload.slug,
          industry: payload.industry,
          status: TenantStatus.ACTIVE,
          plan: payload.plan ?? Plan.STARTER,
          createdAt: now,
          updatedAt: now,
          dataRetentionDays: payload.dataRetentionDays ?? 15,
          saveCallRecordings: payload.saveCallRecordings ?? false,
        }
        db.tenants.unshift(tenant)
        return envelope(tenant)
      })
    }
    const response = await api.post<ApiEnvelope<Tenant>>('/v1/tenants', payload)
    return response.data
  },
  async updateTenant(tenantId: string, payload: UpdateTenantRequest) {
    if (isMockDataMode) {
      return withDb((db) => {
        const tenant = db.tenants.find((item) => item.id === tenantId)
        if (!tenant) throw new Error('Tenant not found')
        Object.assign(tenant, payload, { updatedAt: nowIso() })
        return envelope(tenant)
      })
    }
    const response = await api.put<ApiEnvelope<Tenant>>(`/v1/tenants/${tenantId}`, payload)
    return response.data
  },
  async deleteTenant(tenantId: string) {
    if (isMockDataMode) {
      return withDb((db) => {
        const tenant = db.tenants.find((item) => item.id === tenantId)
        if (!tenant) throw new Error('Tenant not found')
        tenant.status = TenantStatus.SUSPENDED
        tenant.updatedAt = nowIso()
        return envelope({ id: tenantId })
      })
    }
    const response = await api.delete<ApiEnvelope<{ id: string }>>(`/v1/tenants/${tenantId}`)
    return response.data
  },
  async getTenantCalls(tenantId: string, filters?: Record<string, string>) {
    if (isMockDataMode) return listMockCalls(tenantId, filters)
    const response = await api.get<ApiEnvelope<Call[]>>(`/v1/tenants/${tenantId}/calls`, { params: filters })
    return response.data
  },
  async getTenantCall(tenantId: string, callId: string) {
    if (isMockDataMode) return getMockCall(tenantId, callId)
    const response = await api.get<ApiEnvelope<Call>>(`/v1/tenants/${tenantId}/calls/${callId}`)
    return response.data
  },
  async getTenantCallers(tenantId: string, filters?: Record<string, string>) {
    if (isMockDataMode) return listMockCallers(tenantId, filters)
    const response = await api.get<ApiEnvelope<Caller[]>>(`/v1/tenants/${tenantId}/callers`, { params: filters })
    return response.data
  },
  async getTenantCaller(tenantId: string, callerId: string) {
    if (isMockDataMode) return getMockCaller(tenantId, callerId)
    const response = await api.get<ApiEnvelope<Caller>>(`/v1/tenants/${tenantId}/callers/${callerId}`)
    return response.data
  },
  async saveCaller(tenantId: string, callerId: string) {
    if (isMockDataMode) {
      return withDb((db) => {
        const caller = db.callers.find((item) => item.tenantId === tenantId && item.id === callerId)
        if (!caller) throw new Error('Caller not found')
        caller.isSaved = true
        caller.expiresAt = null
        return envelope(caller)
      })
    }
    const response = await api.post<ApiEnvelope<Caller>>(`/v1/tenants/${tenantId}/callers/${callerId}/save`)
    return response.data
  },
  async unsaveCaller(tenantId: string, callerId: string) {
    if (isMockDataMode) {
      return withDb((db) => {
        const caller = db.callers.find((item) => item.tenantId === tenantId && item.id === callerId)
        if (!caller) throw new Error('Caller not found')
        caller.isSaved = false
        caller.expiresAt = daysAgo(-15)
        return envelope(caller)
      })
    }
    const response = await api.post<ApiEnvelope<Caller>>(`/v1/tenants/${tenantId}/callers/${callerId}/unsave`)
    return response.data
  },
  async getAgentConfig(tenantId: string) {
    if (isMockDataMode) {
      const config = loadDb().agentConfigs.find((item) => item.tenantId === tenantId)
      if (!config) throw new Error('Agent config not found')
      return envelope(config)
    }
    const response = await api.get<ApiEnvelope<AgentConfig>>(`/v1/tenants/${tenantId}/agent-config`)
    return response.data
  },
  async updateAgentConfig(tenantId: string, payload: UpdateAgentConfigRequest) {
    if (isMockDataMode) {
      return withDb((db) => {
        const config = db.agentConfigs.find((item) => item.tenantId === tenantId)
        if (!config) throw new Error('Agent config not found')
        Object.assign(config, payload, { updatedAt: nowIso() })
        return envelope(config)
      })
    }
    const response = await api.put<ApiEnvelope<AgentConfig>>(`/v1/tenants/${tenantId}/agent-config`, payload)
    return response.data
  },
  async getPhoneNumbers(tenantId: string) {
    if (isMockDataMode) return envelope(loadDb().phoneNumbers.filter((item) => item.tenantId === tenantId))
    const response = await api.get<ApiEnvelope<PhoneNumber[]>>(`/v1/tenants/${tenantId}/phone-numbers`)
    return response.data
  },
  async createPhoneNumber(tenantId: string, payload: CreatePhoneNumberRequest) {
    if (isMockDataMode) {
      return withDb((db) => {
        const exists = db.phoneNumbers.some((item) => item.number === payload.number)
        if (exists) throw new Error('Phone number already exists')
        const phone: PhoneNumber = {
          id: id('num'),
          number: payload.number,
          provider: payload.provider,
          tenantId,
          label: payload.label ?? null,
          isActive: true,
          createdAt: nowIso(),
        }
        db.phoneNumbers.unshift(phone)
        return envelope(phone)
      })
    }
    const response = await api.post<ApiEnvelope<PhoneNumber>>(`/v1/tenants/${tenantId}/phone-numbers`, payload)
    return response.data
  },
  async updatePhoneNumber(tenantId: string, phoneNumberId: string, payload: UpdatePhoneNumberRequest) {
    if (isMockDataMode) {
      return withDb((db) => {
        const item = db.phoneNumbers.find((row) => row.tenantId === tenantId && row.id === phoneNumberId)
        if (!item) throw new Error('Phone number not found')
        Object.assign(item, payload)
        return envelope(item)
      })
    }
    const response = await api.put<ApiEnvelope<PhoneNumber>>(
      `/v1/tenants/${tenantId}/phone-numbers/${phoneNumberId}`,
      payload
    )
    return response.data
  },
  async deletePhoneNumber(tenantId: string, phoneNumberId: string) {
    if (isMockDataMode) {
      return withDb((db) => {
        db.phoneNumbers = db.phoneNumbers.filter((item) => !(item.tenantId === tenantId && item.id === phoneNumberId))
        return envelope({ id: phoneNumberId })
      })
    }
    const response = await api.delete<ApiEnvelope<{ id: string }>>(`/v1/tenants/${tenantId}/phone-numbers/${phoneNumberId}`)
    return response.data
  },
  async getKnowledge(tenantId: string) {
    if (isMockDataMode) return envelope(loadDb().knowledgeItems.filter((item) => item.tenantId === tenantId))
    const response = await api.get<ApiEnvelope<KnowledgeItem[]>>(`/v1/tenants/${tenantId}/knowledge`)
    return response.data
  },
  async createKnowledge(tenantId: string, payload: CreateKnowledgeRequest) {
    if (isMockDataMode) {
      return withDb((db) => {
        const now = nowIso()
        const knowledge: KnowledgeItem = {
          id: id('k'),
          tenantId,
          title: payload.title,
          content: payload.content,
          category: payload.category ?? null,
          createdAt: now,
          updatedAt: now,
        }
        db.knowledgeItems.unshift(knowledge)
        return envelope(knowledge)
      })
    }
    const response = await api.post<ApiEnvelope<KnowledgeItem>>(`/v1/tenants/${tenantId}/knowledge`, payload)
    return response.data
  },
  async updateKnowledge(tenantId: string, knowledgeId: string, payload: UpdateKnowledgeRequest) {
    if (isMockDataMode) {
      return withDb((db) => {
        const item = db.knowledgeItems.find((row) => row.tenantId === tenantId && row.id === knowledgeId)
        if (!item) throw new Error('Knowledge item not found')
        Object.assign(item, payload, { updatedAt: nowIso() })
        return envelope(item)
      })
    }
    const response = await api.put<ApiEnvelope<KnowledgeItem>>(`/v1/tenants/${tenantId}/knowledge/${knowledgeId}`, payload)
    return response.data
  },
  async deleteKnowledge(tenantId: string, knowledgeId: string) {
    if (isMockDataMode) {
      return withDb((db) => {
        db.knowledgeItems = db.knowledgeItems.filter((item) => !(item.tenantId === tenantId && item.id === knowledgeId))
        return envelope({ id: knowledgeId })
      })
    }
    const response = await api.delete<ApiEnvelope<{ id: string }>>(`/v1/tenants/${tenantId}/knowledge/${knowledgeId}`)
    return response.data
  },
  async getUsers(tenantId: string) {
    if (isMockDataMode) return envelope(loadDb().users.filter((item) => item.tenantId === tenantId))
    const response = await api.get<ApiEnvelope<User[]>>(`/v1/tenants/${tenantId}/users`)
    return response.data
  },
  async createUser(tenantId: string, payload: CreateUserRequest) {
    if (isMockDataMode) {
      return withDb((db) => {
        const now = nowIso()
        const user: User = {
          id: id('user'),
          email: payload.email,
          name: payload.name ?? null,
          role: payload.role,
          tenantId,
          createdAt: now,
          updatedAt: now,
        }
        db.users.unshift(user)
        return envelope(user)
      })
    }
    const response = await api.post<ApiEnvelope<User>>(`/v1/tenants/${tenantId}/users`, payload)
    return response.data
  },
  async updateUser(tenantId: string, userId: string, payload: UpdateUserRequest) {
    if (isMockDataMode) {
      return withDb((db) => {
        const user = db.users.find((item) => item.tenantId === tenantId && item.id === userId)
        if (!user) throw new Error('User not found')
        Object.assign(user, payload, { updatedAt: nowIso() })
        return envelope(user)
      })
    }
    const response = await api.put<ApiEnvelope<User>>(`/v1/tenants/${tenantId}/users/${userId}`, payload)
    return response.data
  },
  async deleteUser(tenantId: string, userId: string) {
    if (isMockDataMode) {
      return withDb((db) => {
        db.users = db.users.filter((item) => !(item.tenantId === tenantId && item.id === userId))
        return envelope({ id: userId })
      })
    }
    const response = await api.delete<ApiEnvelope<{ id: string }>>(`/v1/tenants/${tenantId}/users/${userId}`)
    return response.data
  },
  async login(email: string, password: string) {
    if (isMockAuthMode) {
      if (password !== 'Pass@123') {
        throw new Error('Invalid email or password')
      }

      if (email.toLowerCase() === 'owner@aivoice.ai') {
        return {
          token: `token_super_${Date.now()}`,
          user: {
            accountNo: 'platform',
            email,
            role: ['SUPER_ADMIN'],
            exp: Date.now() + 24 * 60 * 60 * 1000,
          },
        }
      }

      const matchedUser = loadDb().users.find((item) => item.email.toLowerCase() === email.toLowerCase())
      if (!matchedUser) {
        throw new Error('Invalid email or password')
      }

      return {
        token: `token_client_${Date.now()}`,
        user: {
          accountNo: matchedUser.tenantId,
          email: matchedUser.email,
          role: [matchedUser.role],
          exp: Date.now() + 24 * 60 * 60 * 1000,
        },
      }
    }
    const response = await api.post<
      ApiEnvelope<{
        token: string
        user: {
          accountNo: string
          email: string
          role: string[]
          exp: number
        }
      }>
    >('/v1/auth/login', { email, password })
    return unwrapApiData(response.data)
  },
  async getBookingOrders(tenantId: string, filters?: Record<string, string>) {
    if (isMockDataMode) return listMockBookingOrders(tenantId, filters)
    requireMockData('Bookings/orders')
  },
  async updateBookingOrder(
    tenantId: string,
    bookingOrderId: string,
    payload: Partial<BookingOrder>,
  ) {
    if (isMockDataMode) {
      return withDb((db) => {
        const row = db.bookingOrders.find((item) => item.tenantId === tenantId && item.id === bookingOrderId)
        if (!row) throw new Error('Booking/order not found')
        Object.assign(row, payload, { updatedAt: nowIso() })
        return envelope(row)
      })
    }
    requireMockData('Booking/order updates')
  },
  async getConversations(tenantId: string, filters?: Record<string, string>) {
    if (isMockDataMode) {
      const db = loadDb()
      let rows = db.conversations.filter((item) => item.tenantId === tenantId)
      if (filters?.search) {
        const q = filters.search.toLowerCase()
        rows = rows.filter((item) => `${item.customerName} ${item.customerContact} ${item.summary}`.toLowerCase().includes(q))
      }
      if (filters?.channel && filters.channel !== 'ALL') rows = rows.filter((item) => item.channel === filters.channel)
      if (filters?.status && filters.status !== 'ALL') rows = rows.filter((item) => item.status === filters.status)
      rows.sort((a, b) => +new Date(b.lastMessageAt) - +new Date(a.lastMessageAt))
      const { data, pagination } = paginate(rows, toNumber(filters?.page, 1), toNumber(filters?.limit, 20))
      return envelope(data, pagination)
    }
    requireMockData('Omnichannel conversations')
  },
  async updateConversation(tenantId: string, conversationId: string, payload: Partial<OmnichannelConversation>) {
    if (isMockDataMode) {
      return withDb((db) => {
        const row = db.conversations.find((item) => item.tenantId === tenantId && item.id === conversationId)
        if (!row) throw new Error('Conversation not found')
        Object.assign(row, payload, { lastMessageAt: nowIso() })
        return envelope(row)
      })
    }
    requireMockData('Omnichannel conversation updates')
  },
  async getChannels(tenantId: string) {
    if (isMockDataMode) return envelope(loadDb().channels.filter((item) => item.tenantId === tenantId))
    requireMockData('Omnichannel channels')
  },
  async updateChannel(tenantId: string, channelId: string, payload: Partial<OmnichannelChannel>) {
    if (isMockDataMode) {
      return withDb((db) => {
        const row = db.channels.find((item) => item.tenantId === tenantId && item.id === channelId)
        if (!row) throw new Error('Channel not found')
        Object.assign(row, payload, { updatedAt: nowIso() })
        return envelope(row)
      })
    }
    requireMockData('Omnichannel channel updates')
  },
  async getAutomations(tenantId: string) {
    if (isMockDataMode) return envelope(loadDb().automations.filter((item) => item.tenantId === tenantId))
    requireMockData('Omnichannel automations')
  },
  async createAutomation(tenantId: string, payload: Pick<OmnichannelAutomation, 'name' | 'trigger' | 'description'>) {
    if (isMockDataMode) {
      return withDb((db) => {
        const now = nowIso()
        const row: OmnichannelAutomation = {
          id: id('auto'),
          tenantId,
          name: payload.name,
          trigger: payload.trigger,
          description: payload.description,
          status: 'DRAFT',
          runCount: 0,
          lastRunAt: null,
          createdAt: now,
          updatedAt: now,
        }
        db.automations.unshift(row)
        return envelope(row)
      })
    }
    requireMockData('Automation creation')
  },
  async updateAutomation(tenantId: string, automationId: string, payload: Partial<Pick<OmnichannelAutomation, 'name' | 'trigger' | 'description' | 'status'>>) {
    if (isMockDataMode) {
      return withDb((db) => {
        const row = db.automations.find((item) => item.tenantId === tenantId && item.id === automationId)
        if (!row) throw new Error('Automation not found')
        Object.assign(row, payload, { updatedAt: nowIso() })
        return envelope(row)
      })
    }
    requireMockData('Automation updates')
  },
  async deleteAutomation(tenantId: string, automationId: string) {
    if (isMockDataMode) {
      return withDb((db) => {
        db.automations = db.automations.filter((item) => !(item.tenantId === tenantId && item.id === automationId))
        return envelope({ id: automationId })
      })
    }
    requireMockData('Automation deletion')
  },
}

export function resetMockFrontendData() {
  window.localStorage.removeItem(STORAGE_KEY)
}

export function isMockDataEnabled() {
  return isMockDataMode
}

export function unwrap<T>(payload: ApiEnvelope<T>) {
  return unwrapApiData(payload)
}
