# AI Voice Platform - Product Specification

> A multi-tenant SaaS platform enabling businesses to handle customer calls using AI agents with memory and contextual understanding.

---

## Table of Contents
1. [Product Overview](#1-product-overview)
2. [System Architecture](#2-system-architecture)
3. [Core Components](#3-core-components)
4. [Multi-Tenant Data Model](#4-multi-tenant-data-model)
5. [Call Flow](#5-call-flow)
6. [Database Schema](#6-database-schema)
7. [API Specifications](#7-api-specifications)
8. [Configuration](#8-configuration)
9. [Implementation Phases](#9-implementation-phases)

---

## 1. Product Overview

### 1.1 Vision
Build an AI-powered call handling platform where businesses (doctors, restaurants, etc.) can deploy intelligent voice agents that:
- Answer inbound calls in real-time
- Maintain conversation memory across interactions
- Extract structured data (appointments, orders, symptoms)
- Operate with tenant-specific knowledge and personas

### 1.2 Target Users
| Tenant Type | Use Case | Key Extractions |
|-------------|----------|-----------------|
| Doctors/Clinics | Appointment booking, symptom intake | Date, time, patient name, symptoms |
| Restaurants | Order taking, reservations | Items, quantities, delivery address |
| Service Businesses | Lead capture, scheduling | Contact info, service type, preferred time |

### 1.3 Key Differentiators
- **Memory**: Caller recognized across sessions ("Welcome back, Mr. Sharma")
- **Multi-tenant**: Complete data isolation per business
- **India-first**: Exotel integration for Indian telephony
- **Structured extraction**: AI extracts actionable data, not just transcripts

### 1.4 Cost Constraints (CRITICAL)

> **Target: ₹2 per call total infrastructure cost**

This cost target drives all architectural decisions:

| Component | Cost Strategy | Est. Cost/Call |
|-----------|---------------|----------------|
| **Exotel** | Pay-per-minute telephony | ₹0.50 - 1.00 |
| **Vocode** | Self-hosted (FREE) | ₹0.00 |
| **Deepgram STT** | Pay-per-second | ₹0.30 - 0.50 |
| **OpenAI GPT-4o-mini** | Token-based | ₹0.20 - 0.40 |
| **TTS (Google)** | Free tier or ₹0.10/call | ₹0.00 - 0.10 |
| **Server** | Self-hosted/VPS | Amortized |
| **TOTAL** | | **~₹1.00 - 2.00** |

**Why Self-Hosted Vocode?**
- Vocode is **open-source** - no per-call licensing fees
- Full control over the voice pipeline
- Can optimize STT/TTS providers for cost
- **BUT**: Vocode has **NO native Exotel integration** - we must build a custom bridge

### 1.5 Critical Implementation Note

> ⚠️ **Vocode does NOT support Exotel out-of-the-box.**

Vocode natively supports Twilio, Vonage, etc. but NOT Exotel. We must build a **custom Exotel telephony provider** for Vocode that:

1. Receives Exotel webhook when call arrives
2. Connects Exotel's audio stream to Vocode via WebSocket/SIP
3. Handles bidirectional audio streaming
4. Manages call lifecycle (answer, hold, transfer, hangup)

This is the core technical challenge of Phase 1.

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              VOICE PLATFORM                                   │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐   │
│  │   EXOTEL    │───▶│   VOCODE    │───▶│   YOUR      │───▶│  POSTGRES   │   │
│  │  Telephony  │◀───│  Voice AI   │◀───│   BACKEND   │◀───│  + REDIS    │   │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘   │
│        │                  │                   │                  │           │
│        │                  │                   │                  │           │
│   SIP/WebRTC         STT + TTS            LLM + Logic       Persistence     │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

External Services:
├── Deepgram (Speech-to-Text)
├── ElevenLabs / Google TTS (Text-to-Speech)  
├── OpenAI GPT-4 (LLM)
└── Pinecone / pgvector (Knowledge Base)
```

### 2.2 Component Responsibilities

| Component | Technology | Responsibility |
|-----------|------------|----------------|
| Telephony Gateway | Exotel | Phone numbers, call routing, SIP trunking |
| Voice Orchestrator | Vocode (Python) | Real-time STT→LLM→TTS pipeline |
| Application Backend | Express + TypeScript | Business logic, multi-tenancy, APIs |
| Primary Database | PostgreSQL + Prisma | Tenants, calls, extractions, memory |
| Cache Layer | Redis | Session state, rate limiting, short-term memory |
| Vector Store | pgvector or Pinecone | Tenant knowledge bases for RAG |

### 2.3 Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    PRODUCTION SETUP                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────┐     ┌─────────────────┐           │
│  │  Vocode Worker  │     │  Vocode Worker  │  (Scale)  │
│  │   (Python)      │     │   (Python)      │           │
│  └────────┬────────┘     └────────┬────────┘           │
│           │                       │                     │
│           └───────────┬───────────┘                     │
│                       ▼                                 │
│           ┌─────────────────────┐                       │
│           │   Redis (Pub/Sub)   │                       │
│           └──────────┬──────────┘                       │
│                      ▼                                  │
│           ┌─────────────────────┐                       │
│           │  Express Backend    │                       │
│           │  (Node.js / TS)     │                       │
│           └──────────┬──────────┘                       │
│                      ▼                                  │
│           ┌─────────────────────┐                       │
│           │    PostgreSQL       │                       │
│           └─────────────────────┘                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Core Components

### 3.1 Vocode Integration Layer

Vocode is an open-source library for building voice AI agents. We use the **self-hosted** version.

#### 3.1.1 Vocode Agent Configuration

```python
# vocode_config.py - Conceptual structure

class TenantVoiceAgent:
    """
    Each tenant gets a configured voice agent with:
    - Custom system prompt (persona)
    - Tenant-specific knowledge base
    - Extraction schemas
    """
    
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id
        self.config = self.load_tenant_config(tenant_id)
        
    def create_agent(self):
        return VocodeAgent(
            transcriber=DeepgramTranscriber(
                api_key=DEEPGRAM_API_KEY,
                language="en-IN"  # Indian English
            ),
            synthesizer=ElevenLabsSynthesizer(
                api_key=ELEVENLABS_API_KEY,
                voice_id=self.config.voice_id
            ),
            agent=ChatGPTAgent(
                system_prompt=self.config.system_prompt,
                model="gpt-4o-mini",
                functions=self.get_extraction_functions()
            ),
            telephony_config=ExotelConfig(
                account_sid=EXOTEL_SID,
                api_key=EXOTEL_API_KEY
            )
        )
```

#### 3.1.2 Exotel ↔ Vocode Bridge (CUSTOM IMPLEMENTATION REQUIRED)

> ⚠️ **We must BUILD this integration ourselves - Vocode has no Exotel support**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    INBOUND CALL FLOW (WITH CONTEXT INJECTION)                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. Customer dials Exotel virtual number                                    │
│                    ▼                                                        │
│  2. Exotel receives call, triggers webhook                                  │
│     POST /webhooks/exotel/incoming                                          │
│                    ▼                                                        │
│  3. Backend identifies tenant from phone number                             │
│     Maps: phone_number → tenant_id                                          │
│                    ▼                                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 4. CONTEXT INJECTION (CRITICAL STEP - BEFORE VOCODE STARTS)        │   │
│  │    Backend fetches caller's history:                                │   │
│  │    • Previous call summaries                                        │   │
│  │    • Previous SMS conversation summaries                            │   │
│  │    • Extracted data (past appointments, orders)                     │   │
│  │    • Caller preferences and profile                                 │   │
│  │                                                                     │   │
│  │    This context is INJECTED into LLM system prompt.                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                    ▼                                                        │
│  5. Backend creates Vocode agent with injected context                      │
│                    ▼                                                        │
│  6. Backend instructs Exotel to bridge audio to Vocode (WebSocket)          │
│                    ▼                                                        │
│  7. Vocode streams audio bidirectionally                                    │
│     Customer ←→ Vocode ←→ LLM (with full caller context)                   │
│                    ▼                                                        │
│  8. On call end, Vocode returns transcript + extractions + summary          │
│     POST /api/calls/:callId/complete                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 3.1.3 Context Injection Code Example

```typescript
// Runs BEFORE Vocode agent is created - injects history into system prompt
async function buildPromptWithCallerContext(tenantId: string, callerPhone: string) {
  const agentConfig = await prisma.agentConfig.findUnique({ where: { tenantId } });
  const caller = await prisma.caller.findUnique({
    where: { tenantId_phoneNumber: { tenantId, phoneNumber: callerPhone } },
    include: { calls: { orderBy: { startedAt: 'desc' }, take: 3, include: { extractions: true } } }
  });
  
  let contextBlock = "";
  if (caller?.calls.length) {
    contextBlock = `
## CALLER CONTEXT
- Name: ${caller.name || 'Unknown'} | Phone: ${callerPhone}
- Previous Calls: ${caller.totalCalls}
- Last Call Summary: ${caller.calls[0]?.summary || 'None'}
- Past Appointments: ${JSON.stringify(caller.calls.flatMap(c => 
    c.extractions.filter(e => e.type === 'appointment').map(e => e.data)))}
`;
  }
  return `${agentConfig.systemPrompt}\n${contextBlock}`;
}
```

**Result**: Agent says *"Welcome back Mr. Sharma! I see your last visit was for knee pain..."*

### 3.2 Conversation Memory System

#### 3.2.1 Memory Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   MEMORY LAYERS                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  SHORT-TERM (Redis)                                     │
│  ├── Current call context                               │
│  ├── Last 5 conversation turns                          │
│  └── TTL: 24 hours                                      │
│                                                         │
│  LONG-TERM (PostgreSQL)                                 │
│  ├── Full call transcripts                              │
│  ├── Extracted entities                                 │
│  ├── Caller profiles                                    │
│  └── Conversation summaries                             │
│                                                         │
│  SEMANTIC (Vector Store)                                │
│  ├── Embedded conversation chunks                       │
│  ├── Tenant knowledge base                              │
│  └── Similar past interactions                          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### 3.2.2 Caller Recognition Flow

```typescript
// When a call comes in
async function buildCallerContext(tenantId: string, phoneNumber: string) {
  // 1. Find or create caller profile
  const caller = await prisma.caller.upsert({
    where: { tenantId_phoneNumber: { tenantId, phoneNumber } },
    create: { tenantId, phoneNumber },
    update: { lastCallAt: new Date() }
  });

  // 2. Get recent interactions
  const recentCalls = await prisma.call.findMany({
    where: { callerId: caller.id },
    orderBy: { startedAt: 'desc' },
    take: 5,
    include: { extractions: true }
  });

  // 3. Build context for LLM
  return {
    callerName: caller.name,
    isReturning: recentCalls.length > 0,
    previousAppointments: extractAppointments(recentCalls),
    preferences: caller.preferences,
    lastSummary: recentCalls[0]?.summary
  };
}
```

### 3.3 Structured Data Extraction

#### 3.3.1 Extraction via LLM Function Calling

```typescript
// Tenant-specific extraction schemas
const EXTRACTION_SCHEMAS = {
  doctor: {
    appointment: {
      name: "extract_appointment",
      parameters: {
        patient_name: { type: "string" },
        preferred_date: { type: "string", format: "date" },
        preferred_time: { type: "string" },
        reason: { type: "string" },
        urgency: { type: "string", enum: ["routine", "urgent", "emergency"] }
      }
    },
    symptoms: {
      name: "extract_symptoms",
      parameters: {
        symptoms: { type: "array", items: { type: "string" } },
        duration: { type: "string" },
        severity: { type: "integer", min: 1, max: 10 }
      }
    }
  },
  restaurant: {
    order: {
      name: "extract_order",
      parameters: {
        items: { 
          type: "array", 
          items: { 
            name: { type: "string" },
            quantity: { type: "integer" },
            customizations: { type: "string" }
          }
        },
        delivery_address: { type: "string" },
        payment_method: { type: "string" }
      }
    }
  }
};
```

---

## 4. Multi-Tenant Data Model

### 4.1 Tenant Isolation Strategy

```
┌─────────────────────────────────────────────────────────┐
│               MULTI-TENANT ISOLATION                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  DATABASE LEVEL                                         │
│  ├── All tables have tenant_id foreign key              │
│  ├── Row-level security (RLS) enforced                  │
│  └── Indexes on (tenant_id, ...) for all queries       │
│                                                         │
│  APPLICATION LEVEL                                      │
│  ├── Middleware extracts tenant from auth token         │
│  ├── All queries scoped by req.tenantId                 │
│  └── Audit logs for cross-tenant access attempts        │
│                                                         │
│  PHONE NUMBER LEVEL                                     │
│  ├── Each tenant has dedicated Exotel number(s)         │
│  ├── Incoming call → lookup tenant by phone number      │
│  └── Multiple numbers per tenant supported              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Entity Relationships

```
Tenant (1) ─────┬───── (N) PhoneNumber
               │
               ├───── (N) User (dashboard access)
               │
               ├───── (N) Caller (customers who call)
               │            │
               │            └───── (N) Call
               │                        │
               │                        ├───── (N) Transcript
               │                        └───── (N) Extraction
               │
               ├───── (1) AgentConfig (prompts, voice, etc.)
               │
               └───── (N) KnowledgeItem (FAQ, menu, services)
```

---

## 5. Call Flow

### 5.1 Complete Inbound Call Sequence

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        INBOUND CALL SEQUENCE DIAGRAM                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Customer          Exotel           Backend          Vocode          LLM    │
│     │                │                 │               │              │     │
│     │── Dial ───────▶│                 │               │              │     │
│     │                │── Webhook ─────▶│               │              │     │
│     │                │                 │── Lookup ────▶│              │     │
│     │                │                 │  Tenant       │              │     │
│     │                │                 │◀─ Config ─────│              │     │
│     │                │◀─ Bridge SIP ───│               │              │     │
│     │                │                 │               │              │     │
│     │◀═══════════════════════════════════════════════▶│              │     │
│     │           Bidirectional Audio Stream             │              │     │
│     │                │                 │               │              │     │
│     │                │                 │               │── STT ──────▶│     │
│     │                │                 │               │◀─ Response ──│     │
│     │◀══════════════════════════════════ TTS Audio ═══│              │     │
│     │                │                 │               │              │     │
│     │   [Conversation continues...]    │               │              │     │
│     │                │                 │               │              │     │
│     │── Hang up ────▶│                 │               │              │     │
│     │                │── Call End ────▶│               │              │     │
│     │                │                 │◀─ Transcript ─│              │     │
│     │                │                 │◀─ Extractions─│              │     │
│     │                │                 │               │              │     │
│     │                │                 │── Save to DB ─┼──────────────┼──▶  │
│     │                │                 │               │              │     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Call States

```typescript
enum CallStatus {
  RINGING = 'ringing',       // Exotel received call, webhook fired
  CONNECTING = 'connecting', // Bridging to Vocode
  IN_PROGRESS = 'in_progress', // Active conversation
  COMPLETED = 'completed',   // Normal hang up
  FAILED = 'failed',         // Technical error
  NO_ANSWER = 'no_answer',   // Caller hung up before connection
  BUSY = 'busy'              // All agents busy (future)
}
```

---

## 6. Database Schema

### 6.1 Prisma Schema

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// TENANT & AUTHENTICATION
// ============================================

model Tenant {
  id          String   @id @default(uuid())
  name        String
  slug        String   @unique
  industry    Industry
  status      TenantStatus @default(ACTIVE)
  plan        Plan     @default(STARTER)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  users        User[]
  phoneNumbers PhoneNumber[]
  callers      Caller[]
  calls        Call[]
  agentConfig  AgentConfig?
  knowledge    KnowledgeItem[]

  @@index([slug])
}

enum Industry {
  HEALTHCARE
  RESTAURANT
  SERVICES
  RETAIL
  OTHER
}

enum TenantStatus {
  ACTIVE
  SUSPENDED
  TRIAL
}

enum Plan {
  STARTER
  PROFESSIONAL
  ENTERPRISE
}

model User {
  id        String   @id @default(uuid())
  email     String
  name      String?
  role      UserRole @default(MEMBER)
  tenantId  String
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  createdAt DateTime @default(now())

  @@unique([tenantId, email])
  @@index([tenantId])
}

enum UserRole {
  OWNER
  ADMIN
  MEMBER
}

// ============================================
// PHONE NUMBERS
// ============================================

model PhoneNumber {
  id           String   @id @default(uuid())
  number       String   @unique
  provider     Provider @default(EXOTEL)
  tenantId     String
  tenant       Tenant   @relation(fields: [tenantId], references: [id])
  label        String?  // e.g., "Main Line", "Support"
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())

  calls        Call[]

  @@index([tenantId])
  @@index([number])
}

enum Provider {
  EXOTEL
  TWILIO
}

// ============================================
// CALLERS (Customers)
// ============================================

model Caller {
  id          String   @id @default(uuid())
  tenantId    String
  tenant      Tenant   @relation(fields: [tenantId], references: [id])
  phoneNumber String
  name        String?
  email       String?
  preferences Json?    // Stored preferences
  metadata    Json?    // Custom fields
  firstCallAt DateTime @default(now())
  lastCallAt  DateTime @default(now())
  totalCalls  Int      @default(1)

  calls       Call[]

  @@unique([tenantId, phoneNumber])
  @@index([tenantId])
  @@index([phoneNumber])
}

// ============================================
// CALLS & TRANSCRIPTS
// ============================================

model Call {
  id            String     @id @default(uuid())
  externalId    String?    @unique // Exotel call SID
  tenantId      String
  tenant        Tenant     @relation(fields: [tenantId], references: [id])
  phoneNumberId String
  phoneNumber   PhoneNumber @relation(fields: [phoneNumberId], references: [id])
  callerId      String
  caller        Caller     @relation(fields: [callerId], references: [id])
  
  direction     CallDirection @default(INBOUND)
  status        CallStatus    @default(RINGING)
  
  startedAt     DateTime   @default(now())
  answeredAt    DateTime?
  endedAt       DateTime?
  durationSecs  Int?
  
  summary       String?    // AI-generated summary
  sentiment     Sentiment?
  
  transcripts   Transcript[]
  extractions   Extraction[]

  @@index([tenantId])
  @@index([callerId])
  @@index([startedAt])
}

enum CallDirection {
  INBOUND
  OUTBOUND
}

enum CallStatus {
  RINGING
  CONNECTING
  IN_PROGRESS
  COMPLETED
  FAILED
  NO_ANSWER
}

enum Sentiment {
  POSITIVE
  NEUTRAL
  NEGATIVE
}

model Transcript {
  id        String   @id @default(uuid())
  callId    String
  call      Call     @relation(fields: [callId], references: [id])
  role      Speaker
  content   String
  timestamp DateTime @default(now())
  confidence Float?  // STT confidence score

  @@index([callId])
}

enum Speaker {
  CALLER
  AGENT
}

// ============================================
// EXTRACTIONS (Structured Data)
// ============================================

model Extraction {
  id         String   @id @default(uuid())
  callId     String
  call       Call     @relation(fields: [callId], references: [id])
  type       String   // e.g., "appointment", "order", "symptom"
  data       Json     // The extracted structured data
  confidence Float?   // Extraction confidence
  createdAt  DateTime @default(now())

  @@index([callId])
  @@index([type])
}

// ============================================
// AGENT CONFIGURATION
// ============================================

model AgentConfig {
  id              String   @id @default(uuid())
  tenantId        String   @unique
  tenant          Tenant   @relation(fields: [tenantId], references: [id])
  
  // AI Agent Settings
  systemPrompt    String   @db.Text
  voiceId         String?  // ElevenLabs voice ID
  language        String   @default("en-IN")
  
  // Behavior
  maxCallDuration Int      @default(300) // seconds
  greeting        String?
  fallbackMessage String?
  
  // Feature Flags
  enableMemory    Boolean  @default(true)
  enableExtraction Boolean @default(true)
  
  // Extraction Schemas
  extractionSchemas Json?
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

// ============================================
// KNOWLEDGE BASE
// ============================================

model KnowledgeItem {
  id        String   @id @default(uuid())
  tenantId  String
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  title     String
  content   String   @db.Text
  category  String?
  embedding Float[]? @db.Real[] // For pgvector
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([tenantId])
}
```

---

## 7. API Specifications

### 7.1 Webhook Endpoints (Exotel → Backend)

#### POST /webhooks/exotel/incoming
Called when a new call arrives.

```typescript
// Request from Exotel
{
  "CallSid": "abc123",
  "From": "+919876543210",
  "To": "+918888888888", // Your Exotel number
  "Direction": "inbound",
  "CallStatus": "ringing"
}

// Response
{
  "action": "bridge",
  "bridgeTo": "sip:vocode-agent@your-server.com",
  "callerId": "+918888888888"
}
```

#### POST /webhooks/exotel/status
Called on call status changes.

```typescript
{
  "CallSid": "abc123",
  "CallStatus": "completed",
  "Duration": 180
}
```

### 7.2 Internal APIs

#### POST /api/calls/:callId/transcript
Vocode sends transcript chunks.

```typescript
{
  "role": "caller" | "agent",
  "content": "I'd like to book an appointment",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### POST /api/calls/:callId/extraction
Vocode sends extracted data.

```typescript
{
  "type": "appointment",
  "data": {
    "patient_name": "Rahul Sharma",
    "preferred_date": "2024-01-20",
    "preferred_time": "10:00 AM",
    "reason": "Regular checkup"
  },
  "confidence": 0.95
}
```

#### POST /api/calls/:callId/complete
Called when call ends.

```typescript
{
  "status": "completed",
  "duration": 180,
  "summary": "Patient Rahul Sharma called to book appointment...",
  "sentiment": "positive"
}
```

### 7.3 Dashboard APIs

#### GET /api/tenants/:tenantId/calls
List calls with filtering.

```typescript
// Query params
?from=2024-01-01&to=2024-01-31&status=completed&page=1&limit=20

// Response
{
  "calls": [...],
  "pagination": { "total": 150, "page": 1, "pages": 8 }
}
```

#### GET /api/tenants/:tenantId/analytics
Get call analytics.

```typescript
{
  "period": "last_30_days",
  "totalCalls": 500,
  "avgDuration": 145,
  "completedCalls": 480,
  "extractions": {
    "appointments": 120,
    "orders": 0
  }
}
```

---

## 8. Configuration

### 8.1 Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/voiceplatform

# Redis
REDIS_URL=redis://localhost:6379

# Exotel
EXOTEL_ACCOUNT_SID=your_account_sid
EXOTEL_API_KEY=your_api_key
EXOTEL_API_TOKEN=your_api_token
EXOTEL_SUBDOMAIN=your_subdomain

# Voice AI
DEEPGRAM_API_KEY=your_deepgram_key
ELEVENLABS_API_KEY=your_elevenlabs_key
OPENAI_API_KEY=your_openai_key

# Vocode
VOCODE_BASE_URL=http://localhost:3001

# Security
JWT_SECRET=your_jwt_secret
WEBHOOK_SECRET=your_webhook_secret
```

### 8.2 Tenant Configuration Example

```json
{
  "tenantId": "tenant_123",
  "industry": "HEALTHCARE",
  "agentConfig": {
    "systemPrompt": "You are Dr. Sharma's receptionist at City Clinic...",
    "voiceId": "voice_professional_female_indian",
    "greeting": "Thank you for calling City Clinic. How may I help you?",
    "extractionSchemas": ["appointment", "symptoms"],
    "maxCallDuration": 300,
    "language": "en-IN"
  }
}
```

---

## 9. Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Set up project structure
- [ ] Implement database schema
- [ ] Create tenant management APIs
- [ ] Basic Exotel webhook integration
- [ ] Health check and monitoring

### Phase 2: Voice Pipeline (Week 3-4)
- [ ] Vocode integration
- [ ] Exotel ↔ Vocode SIP bridge
- [ ] Basic call handling (answer, talk, hang up)
- [ ] Transcript storage

### Phase 3: Intelligence (Week 5-6)
- [ ] LLM integration with custom prompts
- [ ] Function calling for extractions
- [ ] Caller memory implementation
- [ ] Context retrieval from past calls

### Phase 4: Multi-Tenancy (Week 7-8)
- [ ] Complete tenant isolation
- [ ] Phone number ↔ tenant mapping
- [ ] Per-tenant agent configuration
- [ ] Knowledge base per tenant

### Phase 5: Dashboard (Week 9-10)
- [ ] Authentication (Clerk or similar)
- [ ] Call logs and transcripts view
- [ ] Extraction data display
- [ ] Basic analytics

### Phase 6: Production Hardening (Week 11-12)
- [ ] Error handling and retries
- [ ] Rate limiting
- [ ] Logging and observability
- [ ] Load testing
- [ ] Documentation

---

## Appendix A: Vocode Python Service Structure

```
vocode-service/
├── main.py                 # FastAPI entrypoint
├── config.py               # Environment config
├── agents/
│   ├── base_agent.py       # Base voice agent
│   └── tenant_agent.py     # Tenant-specific agent factory
├── telephony/
│   ├── exotel_bridge.py    # Exotel SIP integration
│   └── call_manager.py     # Call lifecycle management
├── extractors/
│   ├── appointment.py      # Appointment extraction
│   └── order.py            # Order extraction
├── memory/
│   ├── redis_memory.py     # Short-term memory
│   └── context_builder.py  # Build LLM context
└── callbacks/
    └── backend_client.py   # POST to Express backend
```

---

## Appendix B: Sample System Prompts

### Healthcare / Doctor

```
You are Maya, the virtual receptionist at Dr. Sharma's City Clinic.

Your role:
- Schedule appointments for patients
- Answer questions about clinic timings and services
- Collect preliminary symptom information
- Be warm, professional, and empathetic

Clinic Information:
- Open: Monday-Saturday, 9 AM to 7 PM
- Address: 123 MG Road, Mumbai
- Services: General medicine, diabetes care, cardiac checkups

When scheduling appointments:
1. Ask for patient's name
2. Ask for preferred date and time
3. Ask for reason for visit
4. Confirm the booking

If the patient has urgent symptoms (chest pain, difficulty breathing, severe bleeding), 
advise them to go to the emergency room immediately.
```

### Restaurant

```
You are Ravi, the friendly order assistant at Spice Garden Restaurant.

Your role:
- Take food orders for delivery or pickup
- Answer questions about the menu
- Handle special requests and dietary requirements
- Confirm order details and delivery address

Restaurant Information:
- Open: 11 AM to 11 PM daily
- Delivery available within 5 km
- Min order: ₹200

Popular Items:
- Butter Chicken: ₹320
- Paneer Tikka: ₹280
- Biryani (Veg/Non-veg): ₹250/₹350

When taking orders:
1. Greet the customer warmly
2. Ask what they'd like to order
3. Confirm quantities and customizations
4. Ask for delivery address
5. Confirm total and estimated time
```

---

*Document Version: 1.0*
*Last Updated: February 2026*
