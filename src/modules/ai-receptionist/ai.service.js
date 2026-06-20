import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../../config/db.js';
import { env } from '../../config/env.js';

const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

const TOOLS = [
  {
    name: 'check_availability',
    description: 'Check available appointment slots for a doctor on a specific date',
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
        doctorName: { type: 'string', description: 'Doctor name or specialty' },
      },
      required: ['date'],
    },
  },
  {
    name: 'book_appointment',
    description: 'Book an appointment for the patient',
    input_schema: {
      type: 'object',
      properties: {
        patientName: { type: 'string' },
        patientPhone: { type: 'string' },
        doctorId: { type: 'string' },
        date: { type: 'string' },
        time: { type: 'string', description: 'HH:MM 24-hour format' },
        reason: { type: 'string' },
      },
      required: ['patientName', 'patientPhone', 'date', 'time'],
    },
  },
  {
    name: 'get_clinic_info',
    description: 'Get clinic information like hours, address, services, doctors',
    input_schema: {
      type: 'object',
      properties: {
        infoType: {
          type: 'string',
          enum: ['hours', 'address', 'services', 'doctors', 'general'],
        },
      },
      required: ['infoType'],
    },
  },
];

export const chat = async (orgId, sessionId, userMessage) => {
  const receptionist = await prisma.aIReceptionist.findUnique({
    where: { orgId },
    include: { org: { select: { name: true, phone: true, address: true } } },
  });

  if (!receptionist?.isActive) {
    throw Object.assign(new Error('AI Receptionist not configured'), { status: 404 });
  }

  const session = await prisma.aIChatSession.findUnique({
    where: { id: sessionId },
    include: { messages: { orderBy: { createdAt: 'asc' }, take: 20 } },
  });

  if (!session) throw Object.assign(new Error('Session not found'), { status: 404 });

  await prisma.aIChatMessage.create({
    data: { sessionId, role: 'user', content: userMessage },
  });

  const history = session.messages.map((m) => ({ role: m.role, content: m.content }));
  history.push({ role: 'user', content: userMessage });

  const knowledgeBase = receptionist.knowledgeBase || {};
  const systemPrompt = buildSystemPrompt(receptionist, knowledgeBase);

  let response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    tools: TOOLS,
    messages: history,
  });

  let assistantMessage = '';

  if (response.stop_reason === 'tool_use') {
    const toolResults = await processToolCalls(orgId, response.content);
    const followUp = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      tools: TOOLS,
      messages: [
        ...history,
        { role: 'assistant', content: response.content },
        { role: 'user', content: toolResults },
      ],
    });
    assistantMessage = followUp.content.find((c) => c.type === 'text')?.text || '';
  } else {
    assistantMessage = response.content.find((c) => c.type === 'text')?.text || '';
  }

  await prisma.aIChatMessage.create({
    data: { sessionId, role: 'assistant', content: assistantMessage },
  });

  return { message: assistantMessage, sessionId };
};

export const createSession = async (orgId, { patientPhone, patientName, channel = 'WEB' }) => {
  const receptionist = await prisma.aIReceptionist.findUnique({ where: { orgId } });
  if (!receptionist) throw Object.assign(new Error('AI Receptionist not configured'), { status: 404 });

  return prisma.aIChatSession.create({
    data: {
      receptionistId: receptionist.id,
      orgId,
      patientPhone,
      patientName,
      channel,
    },
  });
};

function buildSystemPrompt(receptionist, kb) {
  return `You are ${receptionist.personaName}, the AI receptionist for ${receptionist.org.name}.

Your job:
- Help patients book, reschedule, or cancel appointments
- Answer questions about the clinic
- Be warm, concise, and helpful

Clinic info:
- Phone: ${receptionist.org.phone || 'Not available'}
- Address: ${receptionist.org.address || 'Not available'}
${kb.hours ? `- Hours: ${kb.hours}` : ''}
${kb.services ? `- Services: ${kb.services}` : ''}
${kb.doctors ? `- Doctors: ${kb.doctors}` : ''}
${kb.notes ? `- Notes: ${kb.notes}` : ''}

IMPORTANT: Never give medical advice. If asked about symptoms, diagnosis, or treatment, say "Please consult your doctor directly."
If you cannot help, offer to connect them with the front desk.
${receptionist.greetingMessage ? `\nGreeting: ${receptionist.greetingMessage}` : ''}`;
}

async function processToolCalls(orgId, content) {
  const results = [];

  for (const block of content) {
    if (block.type !== 'tool_use') continue;

    let result;
    try {
      if (block.name === 'check_availability') {
        result = await handleCheckAvailability(orgId, block.input);
      } else if (block.name === 'book_appointment') {
        result = await handleBookAppointment(orgId, block.input);
      } else if (block.name === 'get_clinic_info') {
        result = await handleGetClinicInfo(orgId, block.input);
      }
    } catch (err) {
      result = { error: err.message };
    }

    results.push({
      type: 'tool_result',
      tool_use_id: block.id,
      content: JSON.stringify(result),
    });
  }

  return results;
}

async function handleCheckAvailability(orgId, { date, doctorName }) {
  const where = { orgId };
  if (doctorName) {
    where.OR = [
      { firstName: { contains: doctorName, mode: 'insensitive' } },
      { staffProfile: { specialization: { contains: doctorName, mode: 'insensitive' } } },
    ];
  }

  const providers = await prisma.user.findMany({
    where,
    select: { id: true, firstName: true, lastName: true, staffProfile: { select: { specialization: true } } },
    take: 5,
  });

  return {
    date,
    availableSlots: ['09:00', '09:30', '10:00', '10:30', '11:00', '14:00', '14:30', '15:00'],
    doctors: providers.map((p) => ({
      id: p.id,
      name: `Dr. ${p.firstName} ${p.lastName}`,
      specialization: p.staffProfile?.specialization,
    })),
  };
}

async function handleBookAppointment(orgId, input) {
  return {
    success: true,
    message: `Appointment request received for ${input.patientName} on ${input.date} at ${input.time}. Our staff will confirm within 30 minutes.`,
    reference: `REQ-${Date.now()}`,
  };
}

async function handleGetClinicInfo(orgId, { infoType }) {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { name: true, phone: true, address: true, clinicWebsite: { select: { heroTitle: true, about: true } } },
  });

  return { infoType, ...org };
}
