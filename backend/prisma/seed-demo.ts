import dotenv from 'dotenv';
import fs from 'fs';
import bcrypt from 'bcrypt';
import {
  CallDirection,
  CallStatus,
  Industry,
  LLMProvider,
  Plan,
  PrismaClient,
  Provider,
  Sentiment,
  Speaker,
  STTProvider,
  TelephonyProvider,
  TenantStatus,
  TTSProvider,
  UserRole,
} from '@prisma/client';

const NODE_ENV = process.env.NODE_ENV ?? 'development';
const candidateEnvFiles =
  NODE_ENV === 'development'
    ? [`.env.${NODE_ENV}`, '.env.dev', '.env']
    : [`.env.${NODE_ENV}`, '.env'];

const envFileToLoad = candidateEnvFiles.find(file => fs.existsSync(file));
if (envFileToLoad) {
  dotenv.config({ path: envFileToLoad });
  console.log(`[seed-demo] Loaded ${envFileToLoad} (NODE_ENV=${NODE_ENV})`);
}

const prisma = new PrismaClient();
const DEMO_PASSWORD = 'Pass@123';

const TENANTS = {
  sunlight: {
    id: 'tenant_sunlight_pediatrics',
    name: 'Sunlight Pediatrics',
    slug: 'sunlight-pediatrics',
    industry: Industry.HEALTHCARE,
    status: TenantStatus.ACTIVE,
    plan: Plan.ENTERPRISE,
    dataRetentionDays: 30,
    saveCallRecordings: true,
  },
  meadow: {
    id: 'tenant_meadow_dental',
    name: 'Meadow Dental Studio',
    slug: 'meadow-dental-studio',
    industry: Industry.HEALTHCARE,
    status: TenantStatus.ACTIVE,
    plan: Plan.PROFESSIONAL,
    dataRetentionDays: 21,
    saveCallRecordings: false,
  },
  limeleaf: {
    id: 'tenant_limeleaf_services',
    name: 'Limeleaf Home Services',
    slug: 'limeleaf-home-services',
    industry: Industry.SERVICES,
    status: TenantStatus.TRIAL,
    plan: Plan.STARTER,
    dataRetentionDays: 14,
    saveCallRecordings: false,
  },
} as const;

async function resetDb() {
  await prisma.recording.deleteMany();
  await prisma.transcript.deleteMany();
  await prisma.extraction.deleteMany();
  await prisma.call.deleteMany();
  await prisma.caller.deleteMany();
  await prisma.phoneNumber.deleteMany();
  await prisma.knowledgeItem.deleteMany();
  await prisma.agentConfig.deleteMany();
  await prisma.user.deleteMany();
  await prisma.webhookLog.deleteMany();
  await prisma.tenant.deleteMany();
}

async function seedSunlight(passwordHash: string) {
  const tenant = await prisma.tenant.create({
    data: {
      ...TENANTS.sunlight,
    },
  });

  await prisma.user.createMany({
    data: [
      {
        id: 'user_super_admin',
        email: 'owner@aivoice.ai',
        name: 'Platform Owner',
        passwordHash,
        role: UserRole.SUPER_ADMIN,
        tenantId: null,
        active: true,
      },
      {
        id: 'user_super_admin_2',
        email: 'ops@aivoice.ai',
        name: 'Platform Operations',
        passwordHash,
        role: UserRole.SUPER_ADMIN,
        tenantId: null,
        active: true,
      },
      {
        id: 'user_sunlight_owner',
        email: 'owner@sunlight-pediatrics.ai',
        name: 'Dr. Naina Kapoor',
        passwordHash,
        role: UserRole.OWNER,
        tenantId: tenant.id,
        active: true,
      },
      {
        id: 'user_sunlight_admin',
        email: 'admin@sunlight-pediatrics.ai',
        name: 'Aarav Mehta',
        passwordHash,
        role: UserRole.ADMIN,
        tenantId: tenant.id,
        active: true,
      },
      {
        id: 'user_sunlight_member',
        email: 'member@sunlight-pediatrics.ai',
        name: 'Riya Sharma',
        passwordHash,
        role: UserRole.MEMBER,
        tenantId: tenant.id,
        active: true,
      },
    ],
  });

  await prisma.agentConfig.create({
    data: {
      id: 'cfg_sunlight',
      tenantId: tenant.id,
      systemPrompt:
        'You are the front-desk voice assistant for Sunlight Pediatrics. Help parents with appointments, hours, doctors, and urgent routing. Keep the tone calm, warm, and efficient.',
      language: 'en-IN',
      telephonyProvider: TelephonyProvider.TWILIO,
      sttProvider: STTProvider.DEEPGRAM,
      ttsProvider: TTSProvider.CARTESIA,
      llmProvider: LLMProvider.GROQ,
      llmModel: 'llama-3.1-8b-instant',
      greeting:
        'Thank you for calling Sunlight Pediatrics. I can help with appointments, clinic timings, or connect you to the right desk.',
      fallbackMessage:
        'I can connect you to the clinic team if you would prefer a human assistant.',
      maxCallDuration: 420,
      enableMemory: true,
      enableExtraction: true,
      enableRecording: true,
      extractionSchemas: {
        fields: ['intent', 'doctor', 'appointment_date', 'urgency'],
      },
    },
  });

  await prisma.phoneNumber.createMany({
    data: [
      {
        id: 'num_sunlight_main',
        number: '+14155550101',
        provider: Provider.TWILIO,
        tenantId: tenant.id,
        label: 'Main Reception',
        isActive: true,
      },
      {
        id: 'num_sunlight_urgent',
        number: '+14155550102',
        provider: Provider.TWILIO,
        tenantId: tenant.id,
        label: 'Urgent Callback Line',
        isActive: true,
      },
    ],
  });

  await prisma.knowledgeItem.createMany({
    data: [
      {
        id: 'know_sunlight_hours',
        tenantId: tenant.id,
        title: 'Clinic Hours',
        content:
          'Sunlight Pediatrics is open Monday to Saturday from 9:00 AM to 7:00 PM. Sunday is closed.',
        category: 'Operations',
      },
      {
        id: 'know_sunlight_doctors',
        tenantId: tenant.id,
        title: 'Doctor Availability',
        content:
          'Dr. Naina Kapoor sees general pediatric appointments. Dr. Arjun Rao handles vaccination and follow-up visits on Tuesday, Thursday, and Saturday.',
        category: 'Scheduling',
      },
      {
        id: 'know_sunlight_urgent',
        tenantId: tenant.id,
        title: 'Urgent Escalation Policy',
        content:
          'Escalate immediately to the urgent callback line if the caller reports breathing difficulty, seizure, chest pain, or an infant younger than 3 months with fever.',
        category: 'Safety',
      },
      {
        id: 'know_sunlight_docs',
        tenantId: tenant.id,
        title: 'Documents For New Patients',
        content:
          'New patients should carry previous prescriptions, vaccination records, and a guardian ID at the first consultation.',
        category: 'Onboarding',
      },
    ],
  });

  await prisma.caller.createMany({
    data: [
      {
        id: 'caller_sunlight_1',
        tenantId: tenant.id,
        phoneNumber: '+919810001111',
        name: 'Ananya Sharma',
        email: 'ananya.parent@example.com',
        preferences: { language: 'en-IN', preferredDoctor: 'Dr. Kapoor' },
        metadata: { source: 'voice', childName: 'Ishaan Sharma' },
        firstCallAt: new Date('2026-04-01T07:30:00.000Z'),
        lastCallAt: new Date('2026-04-06T05:30:00.000Z'),
        totalCalls: 3,
        isSaved: true,
      },
      {
        id: 'caller_sunlight_2',
        tenantId: tenant.id,
        phoneNumber: '+919810001112',
        name: 'Rahul Verma',
        email: null,
        preferences: { language: 'hi-IN' },
        metadata: { source: 'voice', childName: 'Aanya Verma' },
        firstCallAt: new Date('2026-03-28T08:15:00.000Z'),
        lastCallAt: new Date('2026-04-05T08:10:00.000Z'),
        totalCalls: 2,
        isSaved: false,
        expiresAt: new Date('2026-05-05T08:10:00.000Z'),
      },
      {
        id: 'caller_sunlight_3',
        tenantId: tenant.id,
        phoneNumber: '+919810001113',
        name: 'Meera Khanna',
        email: 'meera.khanna@example.com',
        preferences: { language: 'en-IN' },
        metadata: { source: 'voice', childName: 'Kabir Khanna' },
        firstCallAt: new Date('2026-04-02T10:00:00.000Z'),
        lastCallAt: new Date('2026-04-07T06:40:00.000Z'),
        totalCalls: 4,
        isSaved: true,
      },
      {
        id: 'caller_sunlight_4',
        tenantId: tenant.id,
        phoneNumber: '+919810001114',
        name: 'Nitin Joshi',
        email: null,
        preferences: { language: 'en-IN' },
        metadata: { source: 'voice' },
        firstCallAt: new Date('2026-04-03T11:00:00.000Z'),
        lastCallAt: new Date('2026-04-06T11:20:00.000Z'),
        totalCalls: 1,
        isSaved: false,
        expiresAt: new Date('2026-05-06T11:20:00.000Z'),
      },
    ],
  });

  await createCall({
    id: 'call_sunlight_1',
    externalId: 'twilio-call-001',
    tenantId: tenant.id,
    phoneNumberId: 'num_sunlight_main',
    callerId: 'caller_sunlight_1',
    direction: CallDirection.INBOUND,
    status: CallStatus.COMPLETED,
    provider: Provider.TWILIO,
    startedAt: new Date('2026-04-06T05:30:00.000Z'),
    answeredAt: new Date('2026-04-06T05:30:08.000Z'),
    endedAt: new Date('2026-04-06T05:34:10.000Z'),
    durationSecs: 242,
    summary:
      'Parent requested an evening follow-up slot for recurring fever and received two available appointment windows.',
    sentiment: Sentiment.NEUTRAL,
    transcripts: [
      ['AGENT', 'Thank you for calling Sunlight Pediatrics. How can I help you today?'],
      ['CALLER', 'I want to book a follow-up appointment for my son later this week.'],
      ['AGENT', 'I can help with that. Do you prefer Dr. Kapoor or Dr. Rao?'],
      ['CALLER', 'Dr. Kapoor, preferably after 5 PM.'],
    ],
    extraction: {
      type: 'appointment_request',
      data: {
        intent: 'follow_up_appointment',
        doctor: 'Dr. Kapoor',
        preferredWindow: 'after 5 PM',
        urgency: 'routine',
      },
    },
    recordingUrl: '/recordings/sunlight/call-001.wav',
  });

  await createCall({
    id: 'call_sunlight_2',
    externalId: 'twilio-call-002',
    tenantId: tenant.id,
    phoneNumberId: 'num_sunlight_main',
    callerId: 'caller_sunlight_2',
    direction: CallDirection.INBOUND,
    status: CallStatus.TRANSFERRED,
    provider: Provider.TWILIO,
    startedAt: new Date('2026-04-05T08:10:00.000Z'),
    answeredAt: new Date('2026-04-05T08:10:05.000Z'),
    endedAt: new Date('2026-04-05T08:12:10.000Z'),
    durationSecs: 125,
    summary:
      'Caller reported high fever for an infant and was transferred to urgent callback handling immediately.',
    sentiment: Sentiment.NEGATIVE,
    transcripts: [
      ['AGENT', 'Please tell me what is happening so I can guide you quickly.'],
      ['CALLER', 'My two-month-old has a fever since morning and is not feeding well.'],
      ['AGENT', 'I am connecting you to the urgent callback line right away.'],
    ],
    extraction: {
      type: 'urgent_triage',
      data: {
        intent: 'urgent_medical_concern',
        ageGroup: 'under_3_months',
        symptom: 'fever',
        urgency: 'critical',
      },
    },
    recordingUrl: '/recordings/sunlight/call-002.wav',
  });

  await createCall({
    id: 'call_sunlight_3',
    externalId: 'twilio-call-003',
    tenantId: tenant.id,
    phoneNumberId: 'num_sunlight_main',
    callerId: 'caller_sunlight_3',
    direction: CallDirection.OUTBOUND,
    status: CallStatus.COMPLETED,
    provider: Provider.TWILIO,
    startedAt: new Date('2026-04-07T06:40:00.000Z'),
    answeredAt: new Date('2026-04-07T06:40:06.000Z'),
    endedAt: new Date('2026-04-07T06:42:15.000Z'),
    durationSecs: 129,
    summary:
      'Clinic callback confirmed vaccination schedule and reminded the caller to carry the child’s records.',
    sentiment: Sentiment.POSITIVE,
    transcripts: [
      ['AGENT', 'This is Sunlight Pediatrics calling back about the vaccination schedule.'],
      ['CALLER', 'Yes, I wanted to confirm the time for tomorrow.'],
      ['AGENT', 'Your slot is tomorrow at 11 AM. Please carry previous vaccination records.'],
    ],
    extraction: {
      type: 'callback_confirmation',
      data: {
        intent: 'vaccination_followup',
        scheduledDate: '2026-04-08',
        scheduledTime: '11:00',
      },
    },
    recordingUrl: '/recordings/sunlight/call-003.wav',
  });
}

async function seedMeadow(passwordHash: string) {
  const tenant = await prisma.tenant.create({
    data: {
      ...TENANTS.meadow,
    },
  });

  await prisma.user.createMany({
    data: [
      {
        id: 'user_meadow_owner',
        email: 'owner@meadow-dental.ai',
        name: 'Dr. Sana Irani',
        passwordHash,
        role: UserRole.OWNER,
        tenantId: tenant.id,
        active: true,
      },
      {
        id: 'user_meadow_admin',
        email: 'admin@meadow-dental.ai',
        name: 'Karan Malhotra',
        passwordHash,
        role: UserRole.ADMIN,
        tenantId: tenant.id,
        active: true,
      },
      {
        id: 'user_meadow_member',
        email: 'member@meadow-dental.ai',
        name: 'Ira Kulkarni',
        passwordHash,
        role: UserRole.MEMBER,
        tenantId: tenant.id,
        active: true,
      },
    ],
  });

  await prisma.agentConfig.create({
    data: {
      id: 'cfg_meadow',
      tenantId: tenant.id,
      systemPrompt:
        'You are the front-desk assistant for Meadow Dental Studio. Handle appointment bookings, reminders, clinic hours, and pricing questions.',
      language: 'en-IN',
      telephonyProvider: TelephonyProvider.TWILIO,
      sttProvider: STTProvider.DEEPGRAM,
      ttsProvider: TTSProvider.CARTESIA,
      llmProvider: LLMProvider.GROQ,
      llmModel: 'llama-3.1-8b-instant',
      greeting:
        'Welcome to Meadow Dental Studio. I can help you with appointments, treatment pricing, and clinic timings.',
      fallbackMessage: 'I can connect you to our front desk if needed.',
      maxCallDuration: 360,
      enableMemory: true,
      enableExtraction: true,
      enableRecording: false,
    },
  });

  await prisma.phoneNumber.createMany({
    data: [
      {
        id: 'num_meadow_main',
        number: '+14155550201',
        provider: Provider.TWILIO,
        tenantId: tenant.id,
        label: 'Front Desk',
        isActive: true,
      },
      {
        id: 'num_meadow_followup',
        number: '+14155550202',
        provider: Provider.TWILIO,
        tenantId: tenant.id,
        label: 'Treatment Follow-up',
        isActive: true,
      },
    ],
  });

  await prisma.knowledgeItem.createMany({
    data: [
      {
        id: 'know_meadow_hours',
        tenantId: tenant.id,
        title: 'Clinic Hours',
        content: 'Open Monday to Saturday from 10:00 AM to 8:00 PM.',
        category: 'Operations',
      },
      {
        id: 'know_meadow_services',
        tenantId: tenant.id,
        title: 'Popular Services',
        content: 'Dental cleaning, root canal consultation, tooth extraction, aligner consult.',
        category: 'Services',
      },
      {
        id: 'know_meadow_pricing',
        tenantId: tenant.id,
        title: 'Consultation Pricing',
        content:
          'General consultation starts at 700 INR. Cleaning starts at 1800 INR. Aligner consultation starts at 1500 INR.',
        category: 'Pricing',
      },
      {
        id: 'know_meadow_docs',
        tenantId: tenant.id,
        title: 'Documents For First Visit',
        content:
          'Carry previous dental scans, current prescriptions, and government ID for the first appointment.',
        category: 'Onboarding',
      },
    ],
  });

  await prisma.caller.createMany({
    data: [
      {
        id: 'caller_meadow_1',
        tenantId: tenant.id,
        phoneNumber: '+919810002111',
        name: 'Vivek Nair',
        email: 'vivek.nair@example.com',
        preferences: { language: 'en-IN', treatment: 'cleaning' },
        metadata: { source: 'voice' },
        firstCallAt: new Date('2026-04-02T07:20:00.000Z'),
        lastCallAt: new Date('2026-04-07T09:10:00.000Z'),
        totalCalls: 2,
        isSaved: true,
      },
      {
        id: 'caller_meadow_2',
        tenantId: tenant.id,
        phoneNumber: '+919810002112',
        name: 'Sonal Gupta',
        email: null,
        preferences: { language: 'hi-IN', treatment: 'root_canal_consult' },
        metadata: { source: 'voice' },
        firstCallAt: new Date('2026-04-01T11:40:00.000Z'),
        lastCallAt: new Date('2026-04-06T12:15:00.000Z'),
        totalCalls: 3,
        isSaved: true,
      },
      {
        id: 'caller_meadow_3',
        tenantId: tenant.id,
        phoneNumber: '+919810002113',
        name: 'Neha Sethi',
        email: 'neha.sethi@example.com',
        preferences: { language: 'en-IN' },
        metadata: { source: 'voice', referral: 'instagram' },
        firstCallAt: new Date('2026-04-03T10:10:00.000Z'),
        lastCallAt: new Date('2026-04-07T04:45:00.000Z'),
        totalCalls: 1,
        isSaved: false,
        expiresAt: new Date('2026-05-07T04:45:00.000Z'),
      },
    ],
  });

  await createCall({
    id: 'call_meadow_1',
    externalId: 'twilio-meadow-001',
    tenantId: tenant.id,
    phoneNumberId: 'num_meadow_main',
    callerId: 'caller_meadow_1',
    direction: CallDirection.INBOUND,
    status: CallStatus.COMPLETED,
    provider: Provider.TWILIO,
    startedAt: new Date('2026-04-07T09:10:00.000Z'),
    answeredAt: new Date('2026-04-07T09:10:06.000Z'),
    endedAt: new Date('2026-04-07T09:13:12.000Z'),
    durationSecs: 186,
    summary:
      'Caller booked a cleaning appointment for Friday evening and confirmed pricing for first-time consultation.',
    sentiment: Sentiment.POSITIVE,
    transcripts: [
      ['AGENT', 'Welcome to Meadow Dental Studio. How can I help you today?'],
      ['CALLER', 'I want to book a cleaning appointment for Friday evening.'],
      ['AGENT', 'We have a 6:30 PM slot available, and the cleaning starts at 1800 INR.'],
      ['CALLER', 'That works for me, please book it.'],
    ],
    extraction: {
      type: 'appointment_booking',
      data: {
        intent: 'cleaning_appointment',
        preferredDate: '2026-04-10',
        preferredTime: '18:30',
        pricingDiscussed: true,
      },
    },
    recordingUrl: '/recordings/meadow/call-001.wav',
  });

  await createCall({
    id: 'call_meadow_2',
    externalId: 'twilio-meadow-002',
    tenantId: tenant.id,
    phoneNumberId: 'num_meadow_followup',
    callerId: 'caller_meadow_2',
    direction: CallDirection.OUTBOUND,
    status: CallStatus.COMPLETED,
    provider: Provider.TWILIO,
    startedAt: new Date('2026-04-06T12:15:00.000Z'),
    answeredAt: new Date('2026-04-06T12:15:04.000Z'),
    endedAt: new Date('2026-04-06T12:17:18.000Z'),
    durationSecs: 134,
    summary:
      'Clinic callback confirmed consultation timing for root canal review and reminded the caller to bring prior scans.',
    sentiment: Sentiment.NEUTRAL,
    transcripts: [
      ['AGENT', 'Calling from Meadow Dental Studio regarding your root canal consultation.'],
      ['CALLER', 'Yes, I wanted to confirm the timing and what I need to bring.'],
      ['AGENT', 'Your appointment is tomorrow at 4 PM. Please bring your prior scans and prescriptions.'],
    ],
    extraction: {
      type: 'consultation_followup',
      data: {
        intent: 'root_canal_consult',
        scheduledDate: '2026-04-07',
        scheduledTime: '16:00',
        reminderGiven: true,
      },
    },
    recordingUrl: '/recordings/meadow/call-002.wav',
  });
}

async function seedLimeleaf(passwordHash: string) {
  const tenant = await prisma.tenant.create({
    data: {
      ...TENANTS.limeleaf,
    },
  });

  await prisma.user.create({
    data: {
      id: 'user_limeleaf_owner',
      email: 'owner@limeleaf-services.ai',
      name: 'Kabir Bansal',
      passwordHash,
      role: UserRole.OWNER,
      tenantId: tenant.id,
      active: true,
    },
  });

  await prisma.agentConfig.create({
    data: {
      id: 'cfg_limeleaf',
      tenantId: tenant.id,
      systemPrompt:
        'You are the service scheduling assistant for Limeleaf Home Services. Gather address, issue summary, and preferred service windows.',
      language: 'en-IN',
      telephonyProvider: TelephonyProvider.TWILIO,
      sttProvider: STTProvider.DEEPGRAM,
      ttsProvider: TTSProvider.CARTESIA,
      llmProvider: LLMProvider.GROQ,
      llmModel: 'llama-3.1-8b-instant',
      greeting:
        'Thank you for calling Limeleaf Home Services. I can help schedule a technician visit.',
      fallbackMessage: 'I can arrange a callback from our service coordinator.',
      maxCallDuration: 360,
      enableMemory: true,
      enableExtraction: true,
      enableRecording: false,
    },
  });
}

async function createCall(input: {
  id: string;
  externalId: string;
  tenantId: string;
  phoneNumberId: string;
  callerId: string;
  direction: CallDirection;
  status: CallStatus;
  provider: Provider;
  startedAt: Date;
  answeredAt: Date;
  endedAt: Date;
  durationSecs: number;
  summary: string;
  sentiment: Sentiment;
  transcripts: [Speaker | 'AGENT' | 'CALLER', string][];
  extraction: { type: string; data: Record<string, unknown> };
  recordingUrl: string;
}) {
  await prisma.call.create({
    data: {
      id: input.id,
      externalId: input.externalId,
      tenantId: input.tenantId,
      phoneNumberId: input.phoneNumberId,
      callerId: input.callerId,
      direction: input.direction,
      status: input.status,
      provider: input.provider,
      startedAt: input.startedAt,
      answeredAt: input.answeredAt,
      endedAt: input.endedAt,
      durationSecs: input.durationSecs,
      summary: input.summary,
      sentiment: input.sentiment,
    },
  });

  for (const [index, transcript] of input.transcripts.entries()) {
    await prisma.transcript.create({
      data: {
        id: `${input.id}_tr_${index + 1}`,
        callId: input.id,
        role: transcript[0] === 'AGENT' ? Speaker.AGENT : Speaker.CALLER,
        content: transcript[1],
        timestamp: new Date(input.startedAt.getTime() + index * 35_000),
        confidence: 0.96,
      },
    });
  }

  await prisma.extraction.create({
    data: {
      id: `${input.id}_ext`,
      callId: input.id,
      type: input.extraction.type,
      data: input.extraction.data,
      confidence: 0.92,
    },
  });

  await prisma.recording.create({
    data: {
      id: `${input.id}_rec`,
      callId: input.id,
      url: input.recordingUrl,
      format: 'wav',
      sizeBytes: 460800,
    },
  });
}

async function main() {
  const shouldReset = process.argv.includes('--reset');

  if (shouldReset) {
    console.log('[seed-demo] Clearing database...');
    await resetDb();
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  console.log('[seed-demo] Seeding demo workspaces and users...');

  await seedSunlight(passwordHash);
  await seedMeadow(passwordHash);
  await seedLimeleaf(passwordHash);

  console.log('[seed-demo] Done.');
  console.log('[seed-demo] Demo login password: Pass@123');
  console.log('[seed-demo] Accounts:');
  console.log('  - Super Admin: owner@aivoice.ai');
  console.log('  - Super Admin (2): ops@aivoice.ai');
  console.log('  - Tenant Owner: owner@sunlight-pediatrics.ai');
  console.log('  - Tenant Admin: admin@sunlight-pediatrics.ai');
  console.log('  - Tenant Member: member@sunlight-pediatrics.ai');
  console.log('  - Meadow Owner: owner@meadow-dental.ai');
  console.log('  - Meadow Admin: admin@meadow-dental.ai');
  console.log('  - Meadow Member: member@meadow-dental.ai');
}

main()
  .catch(async (error) => {
    console.error('[seed-demo] Failed:', error);
    process.exitCode = 1;
    await prisma.$disconnect();
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
