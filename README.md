# AI Voice Platform

A comprehensive multi-tenant SaaS platform that enables businesses (doctors, restaurants, service providers) to handle customer calls using AI voice agents with memory and contextual understanding. Built specifically for the Indian market with native language support.

## Overview

This platform combines a robust **Express.js backend** with **Vocode voice AI** to create intelligent call handling systems. Businesses can deploy AI agents that:

- Answer inbound calls in real-time
- Maintain conversation memory across interactions  
- Extract structured data (appointments, orders, symptoms)
- Operate with tenant-specific knowledge and personas
- Handle Indian telephony via **Exotel** integration
- Support **22 Indian languages** via **Sarvam AI**
- Achieve **~₹1-2 per call** infrastructure cost

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              VOICE PLATFORM                                   │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐   │
│  │   EXOTEL    │───▶│   VOCODE    │───▶│   EXPRESS   │───▶│  POSTGRES   │   │
│  │  Telephony  │◀───│  Voice AI   │◀───│  BACKEND    │◀───│  + PRISMA   │   │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘   │
│        │                  │                   │                  │           │
│   SIP/WebRTC         STT + TTS            Business Logic    Persistence     │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

External Services:
├── Exotel (Indian Telephony)
├── Sarvam AI (Indian STT/TTS - 22 languages)
├── Deepgram (Speech-to-Text)
├── ElevenLabs / Google TTS (Text-to-Speech)
├── OpenAI GPT-4 / Groq (LLM)
└── Redis (Session Cache)
```

## Project Structure

```
.
├── src/                              # Express Backend (TypeScript)
│   ├── app.ts                        # Express app setup
│   ├── server.ts                     # Server with graceful shutdown
│   ├── config/                       # Configuration
│   │   ├── env-config.ts             # Environment variables
│   │   ├── env-schema.ts             # Zod validation schema
│   │   └── prisma.config.ts          # Prisma client singleton
│   ├── features/                     # Feature-based architecture
│   │   └── user/                     # User module
│   │       ├── controllers/          # HTTP request handlers
│   │       ├── services/             # Business logic
│   │       ├── repositories/         # Database access
│   │       ├── routes/               # API routes
│   │       ├── schemas/              # Zod validation schemas
│   │       ├── types/                # TypeScript types
│   │       └── __tests__/            # Unit tests (Vitest)
│   ├── middleware/                   # Global middleware
│   │   ├── auth.middleware.ts        # JWT authentication
│   │   ├── validation.middleware.ts  # Request validation
│   │   ├── security.middleware.ts    # Helmet, rate limiting
│   │   ├── api-error.middleware.ts   # Error handling
│   │   └── pino-logger.ts            # Request logging
│   ├── utils/                        # Utilities
│   │   └── generate-token.util.ts    # JWT token generation
│   └── constants/                    # App constants
│       └── messages.ts               # Response messages
│
├── vocode-core/                      # Vocode Voice AI Library (Enhanced)
│   ├── vocode/
│   │   ├── streaming/
│   │   │   ├── agent/                # LLM Agents
│   │   │   │   ├── chat_gpt_agent.py
│   │   │   │   ├── anthropic_agent.py
│   │   │   │   ├── groq_agent.py     # Fast inference
│   │   │   │   └── langchain_agent.py
│   │   │   │
│   │   │   ├── transcriber/          # STT Engines
│   │   │   │   ├── deepgram_transcriber.py
│   │   │   │   ├── sarvam_transcriber.py    # Indian languages
│   │   │   │   ├── assembly_ai_transcriber.py
│   │   │   │   └── azure_transcriber.py
│   │   │   │
│   │   │   ├── synthesizer/          # TTS Engines
│   │   │   │   ├── eleven_labs_synthesizer.py
│   │   │   │   ├── sarvam_synthesizer.py    # Indian languages
│   │   │   │   ├── azure_synthesizer.py
│   │   │   │   └── google_synthesizer.py
│   │   │   │
│   │   │   ├── telephony/            # Telephony Providers
│   │   │   │   ├── client/
│   │   │   │   │   ├── exotel_client.py     # Indian telephony
│   │   │   │   │   ├── plivo_client.py      # Cloud telephony
│   │   │   │   │   ├── twilio_client.py
│   │   │   │   │   └── vonage_client.py
│   │   │   │   │
│   │   │   │   ├── server/
│   │   │   │   │   ├── exotel_routes.py     # Exotel webhooks
│   │   │   │   │   ├── plivo_routes.py      # Plivo webhooks
│   │   │   │   │   └── base.py
│   │   │   │   │
│   │   │   │   └── conversation/     # Phone conversations
│   │   │   │
│   │   │   ├── action/               # Agent Actions
│   │   │   │   ├── end_conversation.py
│   │   │   │   ├── transfer_call.py
│   │   │   │   └── dtmf.py
│   │   │   │
│   │   │   └── models/               # Configuration models
│   │   │
│   │   └── turn_based/               # Sequential conversations
│   │
│   ├── apps/                         # Sample applications
│   ├── tests/                        # Test suite
│   └── quickstarts/                  # Getting started examples
│
├── docs/
│   └── VOICE_PLATFORM_SPEC.md        # Detailed product specification
├── prisma/                           # Database schema
├── package.json                      # Node.js dependencies
└── README.md                         # This file
```

## Backend Features

### 1. Authentication System
- **JWT-based authentication** with access tokens
- **User registration** with email/password
- **Secure login** with bcrypt password hashing
- **Protected routes** via auth middleware
- **Role-based access control** (RBAC)
- JWT payload includes: `userId`, `role`, `dealerId`

### 2. API Endpoints

#### Public Endpoints
```
GET    /api/users/              - Health check
POST   /api/users/register      - User registration
POST   /api/users/login         - User login
GET    /heartbeat               - Service health check
```

#### Protected Endpoints
```
GET    /api/users/profile       - Get user profile (requires auth)
```

### 3. Request Validation
All incoming requests are validated using **Zod schemas**:
- Register: email, password validation
- Login: credentials validation
- Automatic error responses for invalid data

### 4. Security Features
- **Helmet** - Security headers
- **Rate limiting** - Prevent abuse
- **CORS** - Cross-origin configuration
- **Host whitelist** - URL-based access control
- **JWT secret** - Minimum 32 characters required
- **Environment validation** - All env vars validated at startup

### 5. Graceful Shutdown
The server handles shutdown signals properly:
- Closes database connections (Prisma)
- Closes WebSocket connections
- Terminates child processes
- 10-second timeout for forced shutdown
- Handles uncaught exceptions and unhandled rejections

### 6. Database
- **PostgreSQL** with **Prisma ORM**
- **Multi-tenant architecture** support
- **Connection pooling** via Prisma singleton
- **Schema validation** with Zod

### 7. Testing
- **Vitest** for unit and integration testing
- **Supertest** for API endpoint testing
- Tests for controllers, services, repositories, and routes

### 8. Code Quality
- **TypeScript** - Full type safety
- **ESLint** - Linting with security plugins
- **Prettier** - Code formatting
- **Husky** - Pre-commit hooks

### 9. Logging
- **Pino** - High-performance logging
- **Request logging** middleware
- **Structured logging** with JSON format

## Voice AI Features (Vocode)

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

# Vocode Service
VOCODE_BASE_URL=http://localhost:3001
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
