import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

type IncomingLeadPayload = {
  leadId?: string;
  name?: string;
  phone?: string;
  email?: string;
  source?: string;
  project?: string;
  budget?: number;
  message?: string;
  createdAt?: string;
};

type Agent = {
  id: string;
  name: string;
  email: string;
  assignment_order: number;
};

function getValidationError(payload: IncomingLeadPayload): string | null {
  if (!payload.name?.trim()) return 'Name is required.';
  if (!payload.phone?.trim()) return 'Phone is required.';

  if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    return 'Email format is invalid.';
  }

  if (payload.budget !== undefined && Number.isNaN(Number(payload.budget))) {
    return 'Budget must be a valid number.';
  }

  if (payload.createdAt && Number.isNaN(new Date(payload.createdAt).getTime())) {
    return 'CreatedAt must be a valid date.';
  }

  return null;
}

async function createIncomingEvent(params: {
  payload: IncomingLeadPayload;
  status: string;
  errorMessage?: string;
  leadId?: string;
}) {
  await supabaseAdmin.from('lead_incoming_events').insert({
    external_lead_id: params.payload.leadId ?? null,
    phone: params.payload.phone ?? null,
    email: params.payload.email ?? null,
    raw_payload: params.payload,
    status: params.status,
    error_message: params.errorMessage ?? null,
    lead_id: params.leadId ?? null,
  });
}

async function getNextOnlineAgent(): Promise<Agent | null> {
  const { data: agents, error: agentsError } = await supabaseAdmin
    .from('agents')
    .select('id, name, email, assignment_order')
    .eq('is_online', true)
    .eq('is_active', true)
    .order('assignment_order', { ascending: true });

  if (agentsError) {
    throw new Error(agentsError.message);
  }

  if (!agents || agents.length === 0) {
    return null;
  }

  const onlineAgents = agents as Agent[];

  const { data: state, error: stateError } = await supabaseAdmin
    .from('assignment_state')
    .select('last_assigned_agent_id')
    .eq('id', 1)
    .single();

  if (stateError) {
    throw new Error(stateError.message);
  }

  const lastAssignedAgentId = state?.last_assigned_agent_id as string | null;

  if (!lastAssignedAgentId) {
    return onlineAgents[0];
  }

  const lastIndex = onlineAgents.findIndex((agent) => agent.id === lastAssignedAgentId);

  if (lastIndex === -1) {
    return onlineAgents[0];
  }

  const nextIndex = (lastIndex + 1) % onlineAgents.length;
  return onlineAgents[nextIndex];
}

export async function POST(request: NextRequest) {
  let payload: IncomingLeadPayload;

  const token = request.headers.get('x-api-token');
  const expectedToken = process.env.INCOMING_LEAD_TOKEN;

  if (!expectedToken || token !== expectedToken) {
    return NextResponse.json(
      {
        success: false,
        message: 'Unauthorized request.',
      },
      { status: 401 },
    );
  }

  try {
    payload = (await request.json()) as IncomingLeadPayload;
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: 'Invalid JSON payload.',
      },
      { status: 400 },
    );
  }

  const validationError = getValidationError(payload);

  if (validationError) {
    await createIncomingEvent({
      payload,
      status: 'invalid',
      errorMessage: validationError,
    });

    return NextResponse.json(
      {
        success: false,
        message: validationError,
      },
      { status: 400 },
    );
  }

  const phone = payload.phone?.trim() ?? '';
  const email = payload.email?.trim() ?? null;

  const duplicateQuery = supabaseAdmin
    .from('leads')
    .select('id, name, phone, email')
    .eq('phone', phone);

  const { data: phoneDuplicates, error: phoneDuplicateError } = await duplicateQuery;

  if (phoneDuplicateError) {
    return NextResponse.json(
      {
        success: false,
        message: phoneDuplicateError.message,
      },
      { status: 500 },
    );
  }

  let emailDuplicates: { id: string; name: string; phone: string; email: string | null }[] = [];

  if (email) {
    const { data, error } = await supabaseAdmin
      .from('leads')
      .select('id, name, phone, email')
      .eq('email', email);

    if (error) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        { status: 500 },
      );
    }

    emailDuplicates = data ?? [];
  }

  const duplicateLead = [...(phoneDuplicates ?? []), ...emailDuplicates][0];

  if (duplicateLead) {
    await createIncomingEvent({
      payload,
      status: 'duplicate',
      leadId: duplicateLead.id,
      errorMessage: 'Duplicate lead detected by phone or email.',
    });

    return NextResponse.json(
      {
        success: false,
        message: 'Duplicate lead detected.',
        duplicateLeadId: duplicateLead.id,
      },
      { status: 409 },
    );
  }

  try {
    const nextAgent = await getNextOnlineAgent();

    const { data: insertedLead, error: insertLeadError } = await supabaseAdmin
      .from('leads')
      .insert({
        external_lead_id: payload.leadId ?? null,
        name: payload.name?.trim(),
        phone,
        email,
        source: payload.source ?? null,
        project: payload.project ?? null,
        budget: payload.budget ?? null,
        message: payload.message ?? null,
        status: 'new',
        assigned_agent_id: nextAgent?.id ?? null,
        incoming_created_at: payload.createdAt ?? null,
      })
      .select('id')
      .single();

    if (insertLeadError) {
      await createIncomingEvent({
        payload,
        status: 'failed',
        errorMessage: insertLeadError.message,
      });

      return NextResponse.json(
        {
          success: false,
          message: insertLeadError.message,
        },
        { status: 500 },
      );
    }

    const leadId = insertedLead.id as string;

    await createIncomingEvent({
      payload,
      status: 'success',
      leadId,
    });

    await supabaseAdmin.from('lead_status_history').insert({
      lead_id: leadId,
      old_status: null,
      new_status: 'new',
      changed_by: 'system',
    });

    if (nextAgent) {
      await supabaseAdmin.from('lead_assignment_history').insert({
        lead_id: leadId,
        assigned_agent_id: nextAgent.id,
        assignment_type: 'round_robin',
        reason: 'Auto-assigned to next online agent.',
      });

      await supabaseAdmin.from('notifications').insert({
        agent_id: nextAgent.id,
        lead_id: leadId,
        type: 'lead_assigned',
        message: `New lead assigned: ${payload.name}`,
      });

      await supabaseAdmin
        .from('assignment_state')
        .update({
          last_assigned_agent_id: nextAgent.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1);
    }

    return NextResponse.json(
      {
        success: true,
        message: nextAgent
          ? 'Lead received and assigned successfully.'
          : 'Lead received successfully, but no online agent was available.',
        leadId,
        assignedAgent: nextAgent
          ? {
              id: nextAgent.id,
              name: nextAgent.name,
              email: nextAgent.email,
            }
          : null,
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error.';

    await createIncomingEvent({
      payload,
      status: 'failed',
      errorMessage: message,
    });

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 500 },
    );
  }
}