'use server';

import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function toggleAgentPresence(formData: FormData) {
  const agentId = String(formData.get('agentId') ?? '');
  const currentStatus = String(formData.get('currentStatus') ?? '');

  if (!agentId) {
    throw new Error('Agent ID is required.');
  }

  const nextStatus = currentStatus !== 'true';

  const { error } = await supabaseAdmin
    .from('agents')
    .update({
      is_online: nextStatus,
      last_seen_at: nextStatus ? new Date().toISOString() : null,
    })
    .eq('id', agentId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/agents');
  revalidatePath('/leads');
}

export async function addAgent(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();

  if (!name || !email) {
    throw new Error('Name and email are required.');
  }

  const { data: latestAgent } = await supabaseAdmin
    .from('agents')
    .select('assignment_order')
    .order('assignment_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = latestAgent?.assignment_order
    ? Number(latestAgent.assignment_order) + 1
    : 1;

  const { error } = await supabaseAdmin.from('agents').insert({
    name,
    email,
    is_online: false,
    is_active: true,
    assignment_order: nextOrder,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/agents');
}