// ============================================
// Enums
// ============================================

export enum Industry {
  HEALTHCARE = 'HEALTHCARE',
  RESTAURANT = 'RESTAURANT',
  SERVICES = 'SERVICES',
  RETAIL = 'RETAIL',
  OTHER = 'OTHER',
}

export enum TenantStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  TRIAL = 'TRIAL',
}

export enum Plan {
  STARTER = 'STARTER',
  PROFESSIONAL = 'PROFESSIONAL',
  ENTERPRISE = 'ENTERPRISE',
}

export enum UserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

export enum Provider {
  EXOTEL = 'EXOTEL',
  PLIVO = 'PLIVO',
  TWILIO = 'TWILIO',
}

export enum CallDirection {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
}

export enum CallStatus {
  RINGING = 'RINGING',
  CONNECTING = 'CONNECTING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  NO_ANSWER = 'NO_ANSWER',
  TRANSFERRED = 'TRANSFERRED',
}

export enum Speaker {
  CALLER = 'CALLER',
  AGENT = 'AGENT',
}

// ============================================
// Tenant Types
// ============================================

export interface Tenant {
  id: string
  name: string
  slug: string
  industry: Industry
  status: TenantStatus
  plan: Plan
  createdAt: string
  updatedAt: string
  dataRetentionDays: number
  saveCallRecordings: boolean
}

export interface CreateTenantRequest {
  name: string
  slug: string
  industry: Industry
  plan?: Plan
  dataRetentionDays?: number
  saveCallRecordings?: boolean
}

export interface UpdateTenantRequest {
  name?: string
  slug?: string
  industry?: Industry
  status?: TenantStatus
  plan?: Plan
  dataRetentionDays?: number
  saveCallRecordings?: boolean
}

// ============================================
// User Types
// ============================================

export interface User {
  id: string
  clerkId: string
  email: string
  name: string | null
  role: UserRole
  tenantId: string
  createdAt: string
  updatedAt: string
}

export interface CreateUserRequest {
  email: string
  name?: string
  role: UserRole
}

export interface UpdateUserRequest {
  name?: string
  role?: UserRole
}

// ============================================
// Call Types
// ============================================

export interface Call {
  id: string
  externalId: string | null
  tenantId: string
  phoneNumberId: string
  callerId: string
  direction: CallDirection
  status: CallStatus
  startedAt: string
  answeredAt: string | null
  endedAt: string | null
  durationSecs: number | null
  summary: string | null
  sentiment: string | null
  caller?: Caller
  phoneNumber?: PhoneNumber
  transcripts?: Transcript[]
  extractions?: Extraction[]
  recordings?: Recording[]
}

export interface Transcript {
  id: string
  callId: string
  role: Speaker
  content: string
  timestamp: string
  confidence: number | null
}

export interface Recording {
  id: string
  callId: string
  url: string
  format: string
  sizeBytes: number | null
  createdAt: string
}

export interface Extraction {
  id: string
  callId: string
  type: string
  data: Record<string, unknown>
  confidence: number | null
  createdAt: string
}

// ============================================
// Caller Types
// ============================================

export interface Caller {
  id: string
  tenantId: string
  phoneNumber: string
  name: string | null
  email: string | null
  preferences: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
  firstCallAt: string
  lastCallAt: string
  totalCalls: number
  isSaved: boolean
  expiresAt: string | null
  calls?: Call[]
}

export interface UpdateCallerRequest {
  name?: string
  email?: string
  preferences?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

// ============================================
// Phone Number Types
// ============================================

export interface PhoneNumber {
  id: string
  number: string
  provider: Provider
  tenantId: string
  label: string | null
  isActive: boolean
  createdAt: string
}

export interface CreatePhoneNumberRequest {
  number: string
  provider: Provider
  label?: string
}

export interface UpdatePhoneNumberRequest {
  label?: string
  isActive?: boolean
}

// ============================================
// Agent Config Types
// ============================================

export interface AgentConfig {
  id: string
  tenantId: string
  systemPrompt: string
  voiceId: string | null
  language: string
  sttProvider: string
  ttsProvider: string
  llmProvider: string
  telephonyProvider: string
  providerApiKeys: string | null
  maxCallDuration: number
  greeting: string | null
  fallbackMessage: string | null
  enableMemory: boolean
  enableExtraction: boolean
  enableRecording: boolean
  extractionSchemas: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

export interface UpdateAgentConfigRequest {
  systemPrompt?: string
  voiceId?: string
  language?: string
  sttProvider?: string
  ttsProvider?: string
  llmProvider?: string
  telephonyProvider?: string
  providerApiKeys?: string
  maxCallDuration?: number
  greeting?: string
  fallbackMessage?: string
  enableMemory?: boolean
  enableExtraction?: boolean
  enableRecording?: boolean
  extractionSchemas?: Record<string, unknown>
}

// ============================================
// Knowledge Base Types
// ============================================

export interface KnowledgeItem {
  id: string
  tenantId: string
  title: string
  content: string
  category: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateKnowledgeRequest {
  title: string
  content: string
  category?: string
}

export interface UpdateKnowledgeRequest {
  title?: string
  content?: string
  category?: string
}

// ============================================
// Analytics Types
// ============================================

export interface TenantAnalytics {
  totalCalls: number
  totalDuration: number
  totalCallers: number
  activePhoneNumbers: number
  callsTrend: { date: string; count: number }[]
  callsByStatus: { status: CallStatus; count: number }[]
  topCallers: { callerId: string; phoneNumber: string; name: string | null; callCount: number }[]
}

export interface PlatformAnalytics {
  totalTenants: number
  activeTenants: number
  totalCalls: number
  totalDuration: number
  callsTrend: { date: string; count: number }[]
  tenantsByIndustry: { industry: Industry; count: number }[]
  tenantsByPlan: { plan: Plan; count: number }[]
}

// ============================================
// Omnichannel Types
// ============================================

export type ChannelType = 'VOICE' | 'WHATSAPP' | 'WEB_CHAT' | 'EMAIL'
export type ChannelHealth = 'HEALTHY' | 'DEGRADED' | 'DOWN'
export type ConversationStatus = 'OPEN' | 'PENDING' | 'AI_HANDLED' | 'ESCALATED' | 'RESOLVED'
export type AutomationStatus = 'ACTIVE' | 'DRAFT' | 'PAUSED'

export interface OmnichannelConversation {
  id: string
  tenantId: string
  channel: ChannelType
  customerName: string
  customerContact: string
  status: ConversationStatus
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  summary: string
  assignedTo: string | null
  lastMessageAt: string
  unreadCount: number
}

export interface OmnichannelChannel {
  id: string
  tenantId: string
  type: ChannelType
  provider: string
  isActive: boolean
  health: ChannelHealth
  aiEnabled: boolean
  humanFallback: boolean
  slaTargetMins: number
  updatedAt: string
}

export interface OmnichannelAutomation {
  id: string
  tenantId: string
  name: string
  trigger: string
  description: string
  status: AutomationStatus
  runCount: number
  lastRunAt: string | null
  createdAt: string
  updatedAt: string
}

// ============================================
// Booking / Orders Types
// ============================================

export type BookingOrderType = 'BOOKING' | 'ORDER'
export type BookingOrderStatus =
  | 'NEW'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'

export interface BookingOrder {
  id: string
  tenantId: string
  type: BookingOrderType
  status: BookingOrderStatus
  customerName: string
  customerPhone: string
  channel: ChannelType
  amount: number | null
  itemSummary: string
  scheduledAt: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

export interface ApiError {
  message: string
  statusCode: number
  errors?: Record<string, string[]>
}
