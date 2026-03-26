import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

const EXTERNAL_URL = process.env.BASE_URL || 'https://example.ngrok-free.app';
const TARGET_PHONE_NUMBER = '+916398912969';
const FROM_PHONE_NUMBER = '+19787189580';

const SYSTEM_PROMPT = `You are a friendly AI receptionist for "City Health Clinic" on a live phone call with a patient.
RULES:
- Keep responses to ONE short sentence. Do NOT give long answers.
- ALWAYS respond in Hindi Devanagari script. Example: "हाँ बिल्कुल, मैं आपकी help कर सकता हूँ।"
- Mix common English words naturally (like doctor, appointment, booking, time, today).
- Answer EXACTLY what the caller asks. If they need an appointment, help them book it.
- Never make up facts. Our clinic is open Monday to Saturday, 9 AM to 8 PM. Dr. Sharma and Dr. Gupta are available.
- Never use emojis, markdown, or special characters.
- If caller says bye/goodbye, say "Goodbye" at the end.`;

async function runE2ETest() {
  console.log('🚀 Starting end-to-end Clinic Test...');

  try {
    // 1. Create a Tenant (Clinic)
    const tenantId = uuidv4();
    console.log(`🏥 Creating Clinic (Tenant ID: ${tenantId})...`);
    
    // Check if a demo tenant already exists to avoid clutter, or just upsert
    const tenant = await prisma.tenant.upsert({
      where: { slug: 'city-health-clinic-demo' },
      update: {},
      create: {
        id: tenantId,
        name: 'City Health Clinic Demo',
        slug: 'city-health-clinic-demo',
        industry: 'HEALTHCARE',
        status: 'ACTIVE',
        plan: 'ENTERPRISE',
      },
    });
    
    console.log('✅ Clinic Created/Found:', tenant.name);

    // 2. Configure the AI Agent
    console.log('🤖 Configuring AI Agent...');
    await prisma.agentConfig.upsert({
      where: { tenantId: tenant.id },
      update: {
        systemPrompt: SYSTEM_PROMPT,
        telephonyProvider: 'TWILIO',
        sttProvider: 'DEEPGRAM',
        ttsProvider: 'AZURE',
        llmProvider: 'GROQ',
        llmModel: 'llama-3.3-70b-versatile',
        enableMemory: true,
        enableExtraction: true,
        greeting: 'हेलो! सिटी हेल्थ क्लिनिक में आपका स्वागत है। मैं आपकी कैसे मदद कर सकता हूॅं?',
      },
      create: {
        tenantId: tenant.id,
        systemPrompt: SYSTEM_PROMPT,
        telephonyProvider: 'TWILIO',
        sttProvider: 'DEEPGRAM',
        ttsProvider: 'AZURE',
        llmProvider: 'GROQ',
        llmModel: 'llama-3.3-70b-versatile',
        enableMemory: true,
        enableExtraction: true,
        greeting: 'हेलो! सिटी हेल्थ क्लिनिक में आपका स्वागत है। मैं आपकी कैसे मदद कर सकता हूॅं?',
      },
    });
    console.log('✅ AI Agent Configured with Azure TTS (Arjun) & Groq LLM');

    // 3. Setup Phone Numbers & Caller
    console.log('📱 Setting up Virtual Phone Number and Caller...');
    const phoneNumber = await prisma.phoneNumber.upsert({
      where: { number: FROM_PHONE_NUMBER },
      update: { tenantId: tenant.id },
      create: {
        number: FROM_PHONE_NUMBER,
        provider: 'TWILIO',
        tenantId: tenant.id,
        label: 'Clinic Main Line',
      },
    });

    const caller = await prisma.caller.upsert({
      where: {
        tenantId_phoneNumber: {
          tenantId: tenant.id,
          phoneNumber: TARGET_PHONE_NUMBER,
        },
      },
      update: { name: 'Test Patient' },
      create: {
        tenantId: tenant.id,
        phoneNumber: TARGET_PHONE_NUMBER,
        name: 'Test Patient',
      },
    });
    console.log('✅ Phone Numbers and Caller verified');

    // 4. Trigger Outbound Call via Pipecat pipeline (via Express CallService)
    console.log('📞 Triggering Outbound Call (Express -> Python Node Bridge)...');
    
    const { CallService } = require('../src/features/calls/services/call.service');
    const callService = new CallService();
    
    const result = await callService.triggerOutboundCall(
      tenant.id, 
      phoneNumber.id, 
      TARGET_PHONE_NUMBER
    );

    console.log('====================================================');
    if (result.success) {
      console.log('🎉 Database Setup & Call Trigger Complete!');
      console.log('📞 Call Record:', result.call?.id);
      console.log('✅ Python Bridge accepted the request. Phone should be ringing!');
    } else {
      console.error('❌ Failed to trigger call:', result.error);
    }
    console.log('====================================================');

  } catch (error) {
    console.error('❌ Test Failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runE2ETest();
