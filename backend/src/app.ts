import cors from 'cors';
import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import httpProxy from 'http-proxy';

import { env } from './config/env-config';

// Raw http-proxy for reliable WebSocket + HTTP proxying to Pipecat
const pipecatProxyServer = httpProxy.createProxyServer({
  target: env.PIPECAT_BASE_URL,
  ws: true,
  changeOrigin: true,
});

pipecatProxyServer.on('error', (err, req, res) => {
  console.error('[Pipecat Proxy Error]', err.message);
});

// Express middleware to proxy HTTP requests to Pipecat
const pipecatHttpProxy = (req: any, res: any) => {
  pipecatProxyServer.web(req, res);
};

import agentConfigRoutes from './features/agent-config/routes/agent-config.routes';
import authRoutes from './features/auth/routes/auth.routes';
import callerRoutes from './features/callers/routes/caller.routes';
import internalCallRoutes from './features/calls/internal/routes/internal.routes';
import callRoutes from './features/calls/routes/call.routes';
import knowledgeRoutes from './features/knowledge/routes/knowledge.routes';
import phoneNumberRoutes from './features/phone-numbers/routes/phone-number.routes';
import tenantRoutes from './features/tenant/routes/tenant.routes';
import userRoutes from './features/tenant-users/routes/user.routes';
import testRoutes from './features/test/routes/test.routes';
import exotelWebhookRoutes from './features/webhooks/exotel/exotel.routes';
import plivoWebhookRoutes from './features/webhooks/plivo/plivo.routes';
import twilioWebhookRoutes from './features/webhooks/twilio/twilio.routes';
import { apiErrorHandler, unmatchedRoutes } from './middleware/api-error.middleware';
import { auth, tenantScope } from './middleware/auth.middleware';
import { loggerMiddleware, pinoLogger } from './middleware/pino-logger';
import { rateLimiter } from './middleware/security.middleware';

const app: Application = express();

// Trust proxy (required for ngrok/reverse proxy to work with rate limiter)
app.set('trust proxy', 1);

app.use(rateLimiter);
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Proxy Pipecat-bound routes to Python service (before Express JSON parsing)
app.use('/connect_call', pipecatHttpProxy);     // WebSocket audio streams
app.use('/inbound_call', pipecatHttpProxy);     // Pipecat's own inbound call handler
app.use('/events', pipecatHttpProxy);           // Pipecat events
app.use('/recordings', pipecatHttpProxy);       // Pipecat recordings
app.use('/conversations', pipecatHttpProxy);    // Pipecat conversation API

if (env.NODE_ENV === 'production') {
  app.use(loggerMiddleware);
  app.use(pinoLogger);
}

app.get('/heartbeat', (req: Request, res: Response): void => {
  if (req.log?.info) {
    req.log.info('Heartbeat ok');
  } else {
    console.log('Heartbeat ok');
  }
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/v1/auth', authRoutes);
app.use('/v1/tenants', auth, tenantRoutes);
app.use('/v1/tenants/:tenantId/users', auth, tenantScope, userRoutes);
app.use('/v1/tenants/:tenantId/agent-config', auth, tenantScope, agentConfigRoutes);
app.use('/v1/tenants/:tenantId/phone-numbers', auth, tenantScope, phoneNumberRoutes);
app.use('/v1/tenants/:tenantId/calls', auth, tenantScope, callRoutes);
app.use('/v1/tenants/:tenantId/callers', auth, tenantScope, callerRoutes);
app.use('/v1/tenants/:tenantId/knowledge', auth, tenantScope, knowledgeRoutes);

if (env.NODE_ENV !== 'production') {
  app.use('/test', testRoutes);
}

app.use('/webhooks/exotel', exotelWebhookRoutes);
app.use('/webhooks/plivo', plivoWebhookRoutes);
app.use('/webhooks/twilio', twilioWebhookRoutes);
app.use('/api/internal/calls/:callId', internalCallRoutes);

app.use(apiErrorHandler);
app.use(unmatchedRoutes);

export { app, pipecatProxyServer };
