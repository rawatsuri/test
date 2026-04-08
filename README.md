# AI Voice Platform

A multi-tenant SaaS platform for AI-assisted customer operations. The current repo combines:

- `backend/`: TypeScript/Express API for tenants, callers, calls, knowledge, users, and agent config
- `pipecat-server/`: Python Pipecat runtime for live voice conversations
- `web/`: React dashboard that can run against mock data or the real backend

## Current Product Scope

The current product acceptance bar is the core voice operations loop:

1. inbound or outbound call is created
2. tenant and caller context are resolved
3. Pipecat conversation starts
4. transcripts and extractions are persisted
5. call completion state is saved
6. operators can review calls and callers in the web app

The following surfaces exist in the frontend but are currently deferred:

- bookings / orders
- shared inbox
- channels
- automations
- super-admin analytics

Those should not be treated as shipping functionality until the voice loop above is verified end to end.

## Current Architecture

```text
Telephony Provider -> Express Backend -> PostgreSQL
                     |               |
                     |               -> Prisma domain model
                     |
                     -> Pipecat runtime for live audio sessions
```

The older docs in this repo still reference Vocode in places. The live runtime in this codebase is Pipecat.

## Local Run Modes

The frontend now uses explicit runtime switches:

- `VITE_AUTH_MODE=mock | clerk`
- `VITE_DATA_MODE=mock | api`

Recommended local combinations:

1. `mock auth + mock data`
   Use this when you want the whole dashboard navigable, including deferred UI sections whose backend APIs are not finished yet.

2. `mock auth + api data`
   Use this when you want to exercise the real backend routes that already exist.

## Local Startup

### 1. Backend

Copy `backend/.env.dev.example` and fill in the required values:

```bash
cd backend
cp .env.dev.example .env.development
npm install
npm run dev
```

Minimum values to set for a local boot:

```bash
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://...
MASTER_ENCRYPTION_KEY=...
INTERNAL_API_SECRET=...
PIPECAT_BASE_URL=http://localhost:3001
```

### 2. Pipecat Runtime

```bash
cd pipecat-server
cp .env.example .env
pip install -r requirements.txt
python server.py
```

The runtime listens on `PIPECAT_PORT` and defaults to `3001`.

Minimum Pipecat runtime values for local voice testing:

```bash
BACKEND_BASE_URL=http://localhost:5001
INTERNAL_API_SECRET=... # if backend sets it
DEEPGRAM_API_KEY=...
OPENAI_API_KEY=...      # or GROQ_API_KEY depending on tenant agent config
AZURE_SPEECH_KEY=...    # if tenant TTS provider is Azure
AZURE_SPEECH_REGION=...
```

Important:

- Pipecat now posts transcript, extraction, and completion events back to the backend using `BACKEND_BASE_URL`.
- Seeded tenant agent configs do not store encrypted provider keys by default, so the Pipecat runtime falls back to its own environment variables for STT/TTS/LLM unless you save provider keys in the tenant AI config.

### 3. Frontend

Copy `web/.env.example` and choose the mode you want:

```bash
cd web
cp .env.example .env.local
```

Recommended for the first real run:

```bash
VITE_API_URL=http://localhost:5000
VITE_AUTH_MODE=mock
VITE_DATA_MODE=api
```

Then start the app:

```bash
npm install
npm run dev
```

### 4. Mock Login

When `VITE_AUTH_MODE=mock`:

- password: `Pass@123`
- super admin email: `owner@aivoice.ai`
- tenant user emails: seeded in `web/src/lib/platform-service.ts`

## Voice Runtime Environment

- `PIPECAT_BASE_URL`: backend proxy target and backend-to-Pipecat API client base URL
- `PIPECAT_STREAM_URL`: optional public media-stream base URL when a provider cannot use the internal base URL directly
- `PIPECAT_OUTBOUND_CALL_URL`: optional bridge endpoint for backend-triggered outbound calls
- `BACKEND_BASE_URL`: Pipecat runtime callback target for `/api/internal/calls/:callId/*`
- `INTERNAL_API_SECRET`: shared secret Pipecat uses when calling backend internal routes

## Project Structure

```text
.
├── backend/
├── pipecat-server/
└── web/
```

## Backend Features

### 1. Current Auth Model

- **Production**: Clerk-backed route protection plus tenant scoping
- **Local development**: frontend mock auth is supported; backend tenant APIs are open in development mode
- `GET /v1/auth/me` now returns the current auth context when Clerk-backed auth is active

### 2. Current API Surface

Primary business routes:

```text
GET/POST    /v1/tenants
GET/PUT/DELETE /v1/tenants/:id

GET/POST    /v1/tenants/:tenantId/users
GET/PUT/DELETE /v1/tenants/:tenantId/users/:userId

GET/POST    /v1/tenants/:tenantId/agent-config
PUT/DELETE  /v1/tenants/:tenantId/agent-config

GET/POST    /v1/tenants/:tenantId/phone-numbers
GET/PUT/DELETE /v1/tenants/:tenantId/phone-numbers/:phoneNumberId

GET/POST    /v1/tenants/:tenantId/calls
GET/PUT/DELETE /v1/tenants/:tenantId/calls/:callId
POST        /v1/tenants/:tenantId/calls/outbound

GET/PUT/DELETE /v1/tenants/:tenantId/callers/:callerId
POST        /v1/tenants/:tenantId/callers/:callerId/save
POST        /v1/tenants/:tenantId/callers/:callerId/unsave

GET/POST    /v1/tenants/:tenantId/knowledge
GET         /v1/tenants/:tenantId/knowledge/search
GET         /v1/tenants/:tenantId/knowledge/context
GET/PUT/DELETE /v1/tenants/:tenantId/knowledge/:knowledgeId
```

Integration routes:

```text
POST /webhooks/exotel/incoming
POST /webhooks/exotel/status
POST /webhooks/plivo/incoming
POST /webhooks/plivo/status
POST /webhooks/twilio/incoming
POST /webhooks/twilio/status

POST /api/internal/calls/:callId/transcript
POST /api/internal/calls/:callId/extraction
POST /api/internal/calls/:callId/complete
POST /api/internal/calls/:callId/transfer
```

### 3. Cross-Cutting Infrastructure

- **Environment validation** with Zod at process start
- **Prisma singleton** for database access
- **Helmet**, rate limiting, JSON body parsing, and CORS
- **Webhook signature validation** for Exotel, Plivo, and Twilio
- **HTTP/WebSocket proxying** from the backend to the Pipecat runtime

### 4. Data Model

- **PostgreSQL** with **Prisma ORM**
- Multi-tenant entities for `Tenant`, `User`, `PhoneNumber`, `Caller`, `Call`, `Transcript`, `Extraction`, `AgentConfig`, `KnowledgeItem`, and `Recording`
- Tenant-level data retention with cleanup support

### 5. Voice Runtime Integration

- Backend receives telephony webhooks
- Backend builds caller context and tenant-specific agent config
- Backend creates Pipecat conversations
- Pipecat calls back into internal routes to persist transcripts, extractions, and completion state

### 6. Current Priority

Before expanding into omnichannel or workflow automation, verify:

1. real telephony webhook entry
2. context injection into Pipecat
3. transcript persistence into `Transcript`
4. extraction persistence into `Extraction`
5. final summary / completion persistence into `Call`

### 6. Testing And Quality

- **Vitest** for unit and integration tests
- **TypeScript** throughout
- **ESLint** and **Prettier**
- **Pino** logging in production

## Voice AI Features

This section is historical and still uses older Vocode-oriented labels in places. The active runtime in this repo is Pipecat.

### Custom Indian Additions

#### 1. Sarvam AI Integration 🇮🇳
**Real-time STT (Speech-to-Text)**
- WebSocket-based streaming
- 22 Indian languages supported:
  - Hindi (hi-IN), Bengali (bn-IN), Tamil (ta-IN), Telugu (te-IN)
  - Kannada (kn-IN), Malayalam (ml-IN), Marathi (mr-IN), Gujarati (gu-IN)
  - Punjabi (pa-IN), Odia (or-IN), Indian English (en-IN)
  - And more...
- **Code-mixing support** - Switch languages mid-sentence
- Auto language detection
- Optimized for 8kHz/16kHz telephony audio
- **Pricing: ₹30/hour (₹0.50/minute)**

**TTS (Text-to-Speech)**
- REST API-based synthesis
- Indian accent voices
- Optimized for Indian languages
- Base64 audio response

**Files:**
- `vocode/streaming/transcriber/sarvam_transcriber.py`
- `vocode/streaming/synthesizer/sarvam_synthesizer.py`
- `vocode/streaming/models/transcriber.py` (SarvamTranscriberConfig)
- `vocode/streaming/models/synthesizer.py` (SarvamSynthesizerConfig)

#### 2. Exotel Integration 🇮🇳
**Indian Cloud Telephony**
- Native Exotel Connect API support
- Voicebot Applet for WebSocket streaming
- Outbound call creation
- Call termination
- Webhook handling for inbound calls
- Audio format: base64 encoded 16-bit, 8kHz mono PCM

**Files:**
- `vocode/streaming/telephony/client/exotel_client.py`
- `vocode/streaming/telephony/server/exotel_routes.py`
- `vocode/streaming/models/telephony.py` (ExotelConfig)

#### 3. Plivo Integration
**Cloud Telephony**
- Plivo Voice API support
- XML-based call control
- Audio streaming via `<Stream>` element
- Bidirectional WebSocket support
- Webhook routes for answer/hangup/status

**Files:**
- `vocode/streaming/telephony/client/plivo_client.py`
- `vocode/streaming/telephony/server/plivo_routes.py`

#### 4. Groq Agent
**Fast LLM Inference**
- Groq API integration for ultra-low latency
- Mixtral, Llama models
- Compatible with OpenAI-style API
- Streaming response support
- **Ideal for real-time voice conversations**

**Files:**
- `vocode/streaming/agent/groq_agent.py`
- `vocode/streaming/models/agent.py` (GroqAgentConfig)

### Standard Integrations

#### Speech-to-Text (STT)
- **Deepgram** (Primary) - Real-time streaming
- **Sarvam AI** - Indian languages
- **AssemblyAI** - High accuracy
- **Azure Speech** - Microsoft cloud
- **Google Cloud Speech** - Google cloud
- **Whisper** - OpenAI
- **Gladia** - Word-level timestamps

#### Text-to-Speech (TTS)
- **ElevenLabs** (Primary) - High quality voices
- **Sarvam AI** - Indian languages
- **Azure TTS** - Microsoft cloud
- **Google Cloud TTS** - Google cloud
- **Cartesia** - Sonic voices
- **Play.ht** - Voice cloning
- **Coqui** - Open source
- **Bark** - Open source
- **Rime** - Fast synthesis

#### Language Models
- **OpenAI GPT-4 / GPT-4o-mini**
- **Anthropic Claude**
- **Groq** - Fast inference
- **LangChain** - Agent framework
- **Vertex AI** - Google models

#### Telephony
- **Exotel** - Indian provider (Custom)
- **Plivo** - Cloud communications (Custom)
- **Twilio** - Global leader
- **Vonage** - Enterprise

### Conversation Memory
- **Short-term memory** (Redis) - Current call context, last 5 turns
- **Long-term memory** (PostgreSQL) - Full transcripts, caller profiles
- **Semantic memory** (Vector DB) - Knowledge bases for RAG

### Agent Actions
- End conversation
- Transfer call
- Send DTMF tones
- Record email
- Wait/pause

### Multi-Tenancy
- Complete data isolation per business
- Dedicated phone numbers per tenant
- Custom agent configurations per tenant
- Tenant-specific knowledge bases

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL 14+
- Redis (optional, for caching)
- Python 3.9+ (for Vocode)
- Exotel account (for Indian telephony)
- Sarvam AI account (for Indian languages)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd voice-platform
```

2. **Install backend dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.dev.example .env.dev
```

Edit `.env.dev`:
```env
# Server
NODE_ENV=development
PORT=5000
LOG_LEVEL=debug

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/voiceplatform
SHADOW_DATABASE_URL=postgresql://user:password@localhost:5432/voiceplatform_shadow

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# CORS
WHITE_LIST_URLS=http://localhost:3000,http://localhost:5173

# Exotel (Indian Telephony)
EXOTEL_ACCOUNT_SID=your_exotel_sid
EXOTEL_API_KEY=your_exotel_key
EXOTEL_API_TOKEN=your_exotel_token
EXOTEL_SUBDOMAIN=api

# Sarvam AI (Indian STT/TTS)
SARVAM_API_KEY=your_sarvam_key

# Voice AI
DEEPGRAM_API_KEY=your_deepgram_key
ELEVENLABS_API_KEY=your_elevenlabs_key
OPENAI_API_KEY=your_openai_key
GROQ_API_KEY=your_groq_key

# Pipecat Service
PIPECAT_BASE_URL=http://localhost:3001
```

4. **Set up the database**
```bash
npx prisma migrate dev --name init
npx prisma generate
```

5. **Run the backend**
```bash
# Development mode with hot reload
npm run dev

# Production build
npm run build
npm start
```

### Vocode Setup

1. **Install Vocode dependencies**
```bash
cd vocode-core
pip install -e ".[groq]"  # Include Groq support
```

2. **Run a quickstart example**
```bash
# With Sarvam AI (Indian languages)
python quickstarts/streaming_conversation.py
```

## API Usage Examples

### Register User
```bash
curl -X POST http://localhost:5000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123",
    "name": "John Doe"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123"
  }'
```

### Get Profile (Protected)
```bash
curl -X GET http://localhost:5000/api/users/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

## Using Custom Integrations

### Sarvam AI (Indian Languages)

```python
from vocode.streaming.models.transcriber import SarvamTranscriberConfig
from vocode.streaming.models.synthesizer import SarvamSynthesizerConfig
from vocode.streaming.transcriber.sarvam_transcriber import SarvamTranscriber
from vocode.streaming.synthesizer.sarvam_synthesizer import SarvamSynthesizer

# STT with Hindi
transcriber = SarvamTranscriber(
    SarvamTranscriberConfig(
        api_key=os.getenv("SARVAM_API_KEY"),
        language="hi-IN",  # Hindi
        sampling_rate=16000,
    )
)

# TTS with Indian English
synthesizer = SarvamSynthesizer(
    SarvamSynthesizerConfig(
        api_key=os.getenv("SARVAM_API_KEY"),
        language="en-IN",  # Indian English
    )
)
```

### Exotel (Indian Telephony)

```python
from vocode.streaming.telephony.client.exotel_client import ExotelClient
from vocode.streaming.models.telephony import ExotelConfig

# Configure Exotel
exotel_config = ExotelConfig(
    account_sid="your_account_sid",
    api_key="your_api_key",
    api_token="your_api_token",
    subdomain="api",
)

# Create client
exotel_client = ExotelClient(
    base_url="your-domain.com",
    maybe_exotel_config=exotel_config,
)

# Create outbound call
call_sid = await exotel_client.create_call(
    conversation_id="conv-123",
    to_phone="+919876543210",
    from_phone="+918888888888",
)

# End call
await exotel_client.end_call(call_sid)
```

### Groq (Fast Inference)

```python
from vocode.streaming.agent.groq_agent import GroqAgent
from vocode.streaming.models.agent import GroqAgentConfig

# Fast inference with Groq
agent = GroqAgent(
    GroqAgentConfig(
        groq_api_key=os.getenv("GROQ_API_KEY"),
        model="mixtral-8x7b-32768",
        initial_message=BaseMessage(text="Hello!"),
        prompt_preamble="You are a helpful assistant.",
    )
)
```

### Plivo

```python
from vocode.streaming.telephony.client.plivo_client import PlivoClient
from vocode.streaming.models.telephony import PlivoConfig

# Configure Plivo
plivo_config = PlivoConfig(
    auth_id="your_auth_id",
    auth_token="your_auth_token",
)

# Create client
plivo_client = PlivoClient(
    base_url="your-domain.com",
    maybe_plivo_config=plivo_config,
)
```

## Development

### Available Scripts
```bash
npm run dev           # Start development server
npm run build         # Build for production
npm start             # Start production server
npm run lint          # Run ESLint
npm run lint:fix      # Fix ESLint errors
npm run format        # Format with Prettier
npm run test          # Run tests (Vitest)
npm run test:ci       # Run tests in CI mode
```

### Project Architecture

#### Feature-Based Structure
```
src/features/user/
├── controllers/user.controller.ts    # HTTP layer
├── services/user.service.ts          # Business logic
├── repositories/user.repository.ts   # Data access
├── routes/user.routes.ts             # Route definitions
├── schemas/user.schema.ts            # Validation schemas
├── types/user.types.ts               # TypeScript types
└── __tests__/                        # Unit tests
```

**Benefits:**
- Each feature is self-contained
- Easy to add/remove features
- Clear separation of concerns
- Better code organization

#### Dependency Injection
Services and repositories are instantiated in routes:
```typescript
const userRepository = new UserRepository(prisma);
const userService = new UserService(userRepository);
const userController = new UserController(userService);
```

### Testing

Run the test suite:
```bash
# Run all tests
npm run test

# Run with coverage
npm run test -- --coverage

# Run specific test file
npm run test -- src/features/user/__tests__/user.controller.spec.ts
```

## Cost Analysis (India-Focused)

**Target: ₹2 per call total infrastructure cost**

| Component | Provider | Cost Strategy | Est. Cost/Call |
|-----------|----------|---------------|----------------|
| **Telephony** | Exotel | Pay-per-minute | ₹0.50 - 1.00 |
| **Vocode** | Self-hosted | FREE | ₹0.00 |
| **STT** | Sarvam AI | ₹0.50/minute | ₹0.30 - 0.50 |
| **LLM** | Groq / OpenAI | Token-based | ₹0.20 - 0.40 |
| **TTS** | Sarvam AI / Google | Low cost | ₹0.00 - 0.10 |
| **Server** | Self-hosted/VPS | Amortized | Minimal |
| **TOTAL** | | | **~₹1.00 - 2.00** |

**Why These Choices?**
- **Sarvam AI**: Optimized for Indian languages at low cost
- **Exotel**: Native Indian telephony with local numbers
- **Groq**: Ultra-fast inference for real-time conversations
- **Self-hosted Vocode**: No per-call licensing fees

## Use Cases

### Healthcare / Doctors
- Appointment booking
- Symptom intake in local languages
- Prescription refills
- Follow-up reminders

### Restaurants
- Order taking in Hindi/English
- Table reservations
- Menu inquiries
- Delivery tracking

### Service Businesses
- Lead capture
- Appointment scheduling
- Quote generation
- Service inquiries

## Documentation

- **Product Specification**: See `docs/VOICE_PLATFORM_SPEC.md`
- **Vocode Docs**: [docs.vocode.dev](https://docs.vocode.dev/open-source)
- **Sarvam AI Docs**: [docs.sarvam.ai](https://docs.sarvam.ai)
- **Exotel Docs**: [developer.exotel.com](https://developer.exotel.com)

## Deployment

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Use strong `JWT_SECRET` (64+ characters)
- [ ] Configure `WHITE_LIST_URLS` properly
- [ ] Set up PostgreSQL with SSL
- [ ] Configure Redis for session storage
- [ ] Set up Exotel webhooks
- [ ] Set up Sarvam AI API keys
- [ ] Enable rate limiting
- [ ] Configure logging (Pino)
- [ ] Set up monitoring (health checks)

### Docker Deployment
```dockerfile
# Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["node", "dist/server.js"]
```

Build and run:
```bash
docker build -t voice-platform .
docker run -p 5000:5000 --env-file .env voice-platform
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Open a GitHub issue
- Check the product specification in `docs/`
- Review Vocode documentation at docs.vocode.dev

---

**Built with:** Node.js, Express, TypeScript, Prisma, PostgreSQL, Vocode, and ❤️

**Made for India:** Sarvam AI, Exotel integration for local languages and telephony
