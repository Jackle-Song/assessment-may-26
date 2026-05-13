"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function updateLeadStatus(formData: FormData) {
  const leadId = String(formData.get("leadId") ?? "");
  const newStatus = String(formData.get("status") ?? "");
  const oldStatus = String(formData.get("oldStatus") ?? "");

  if (!leadId || !newStatus) {
    throw new Error("Lead ID and status are required.");
  }

  const { error: updateError } = await supabaseAdmin
    .from("leads")
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  if (oldStatus !== newStatus) {
    const { error: historyError } = await supabaseAdmin
      .from("lead_status_history")
      .insert({
        lead_id: leadId,
        old_status: oldStatus || null,
        new_status: newStatus,
        changed_by: "internal_user",
      });

    if (historyError) {
      throw new Error(historyError.message);
    }
  }

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");

  redirect(`/leads/${leadId}`);
}

export async function addLeadNote(formData: FormData) {
  const leadId = String(formData.get("leadId") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (!leadId || !note) {
    throw new Error("Lead ID and note are required.");
  }

  const { error } = await supabaseAdmin.from("lead_notes").insert({
    lead_id: leadId,
    note,
    created_by: "internal_user",
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/leads/${leadId}`);
}

export async function assignLeadToAgent(formData: FormData) {
  const leadId = String(formData.get("leadId") ?? "");
  const agentId = String(formData.get("agentId") ?? "");

  if (!leadId || !agentId) {
    throw new Error("Lead ID and agent are required.");
  }

  const { data: agent, error: agentError } = await supabaseAdmin
    .from("agents")
    .select("id, name, email, is_online, is_active")
    .eq("id", agentId)
    .single();

  if (agentError || !agent) {
    throw new Error(agentError?.message ?? "Agent not found.");
  }

  if (!agent.is_active) {
    throw new Error("Selected agent is inactive.");
  }

  if (!agent.is_online) {
    throw new Error(
      "Selected agent is offline. Please assign to an online agent.",
    );
  }

  const { error: updateError } = await supabaseAdmin
    .from("leads")
    .update({
      assigned_agent_id: agentId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  const { error: historyError } = await supabaseAdmin
    .from("lead_assignment_history")
    .insert({
      lead_id: leadId,
      assigned_agent_id: agentId,
      assignment_type: "manual",
      reason: "Manually assigned by internal user.",
    });

  if (historyError) {
    throw new Error(historyError.message);
  }

  const { error: notificationError } = await supabaseAdmin
    .from("notifications")
    .insert({
      agent_id: agentId,
      lead_id: leadId,
      type: "lead_assigned",
      message: `Lead manually assigned to ${agent.name}.`,
    });

  if (notificationError) {
    throw new Error(notificationError.message);
  }

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
}
