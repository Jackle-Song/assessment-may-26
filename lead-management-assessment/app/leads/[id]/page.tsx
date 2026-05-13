import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { addLeadNote, assignLeadToAgent, updateLeadStatus } from "./actions";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type Agent = {
  id: string;
  name: string;
  email: string;
  is_online: boolean;
};

type AgentRelation =
  | {
      name: string;
      email: string;
      is_online: boolean;
    }
  | {
      name: string;
      email: string;
      is_online: boolean;
    }[]
  | null;

type Lead = {
  id: string;
  external_lead_id: string | null;
  name: string;
  phone: string;
  email: string | null;
  source: string | null;
  project: string | null;
  budget: number | null;
  message: string | null;
  status: string;
  assigned_agent_id: string | null;
  incoming_created_at: string | null;
  created_at: string;
  updated_at: string;
  agents: AgentRelation;
};

type Note = {
  id: string;
  note: string;
  created_by: string | null;
  created_at: string;
};

type StatusHistory = {
  id: string;
  old_status: string | null;
  new_status: string;
  changed_by: string | null;
  created_at: string;
};

type AssignmentHistory = {
  id: string;
  assignment_type: string;
  reason: string | null;
  created_at: string;
  agents:
    | {
        name: string;
        email: string;
      }[]
    | null;
};

const leadStatuses = [
  "new",
  "contacted",
  "qualified",
  "follow_up",
  "closed",
  "lost",
];

export default async function LeadDetailPage({ params }: PageProps) {
  const { id } = await params;

  const { data: leadData, error: leadError } = await supabaseAdmin
    .from("leads")
    .select(
      `
      id,
      external_lead_id,
      name,
      phone,
      email,
      source,
      project,
      budget,
      message,
      status,
      assigned_agent_id,
      incoming_created_at,
      created_at,
      updated_at,
      agents (
        name,
        email,
        is_online
      )
    `,
    )
    .eq("id", id)
    .single();

  if (leadError || !leadData) {
    notFound();
  }

  const lead = leadData as Lead;

  const assignedAgent = Array.isArray(lead.agents)
    ? (lead.agents[0] ?? null)
    : lead.agents;

  const { data: agentsData } = await supabaseAdmin
    .from("agents")
    .select("id, name, email, is_online")
    .eq("is_active", true)
    .order("assignment_order", { ascending: true });

  const { data: notesData } = await supabaseAdmin
    .from("lead_notes")
    .select("id, note, created_by, created_at")
    .eq("lead_id", id)
    .order("created_at", { ascending: false });

  const { data: statusHistoryData } = await supabaseAdmin
    .from("lead_status_history")
    .select("id, old_status, new_status, changed_by, created_at")
    .eq("lead_id", id)
    .order("created_at", { ascending: false });

  const { data: assignmentHistoryData } = await supabaseAdmin
    .from("lead_assignment_history")
    .select(
      `
      id,
      assignment_type,
      reason,
      created_at,
      agents (
        name,
        email
      )
    `,
    )
    .eq("lead_id", id)
    .order("created_at", { ascending: false });

  const agents = (agentsData ?? []) as Agent[];
  const notes = (notesData ?? []) as Note[];
  const statusHistory = (statusHistoryData ?? []) as StatusHistory[];
  const assignmentHistory = (assignmentHistoryData ??
    []) as AssignmentHistory[];

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <Link
            href="/leads"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            ← Back to Leads
          </Link>

          <div className="mt-4 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{lead.name}</h1>
              <p className="mt-1 text-sm text-gray-500">
                Lead ID: {lead.external_lead_id ?? "-"}
              </p>
            </div>

            <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700">
              {lead.status}
            </span>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="lg:col-span-2 space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                Lead Details
              </h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <Info label="Phone" value={lead.phone} />
                <Info label="Email" value={lead.email ?? "-"} />
                <Info label="Source" value={lead.source ?? "-"} />
                <Info label="Project" value={lead.project ?? "-"} />
                <Info
                  label="Budget"
                  value={
                    lead.budget
                      ? `RM ${Number(lead.budget).toLocaleString()}`
                      : "-"
                  }
                />
                <Info
                  label="Incoming Created At"
                  value={
                    lead.incoming_created_at
                      ? new Date(lead.incoming_created_at).toLocaleString()
                      : "-"
                  }
                />
              </div>

              <div className="mt-4">
                <p className="text-sm font-medium text-gray-500">Message</p>
                <p className="mt-1 rounded-lg bg-gray-50 p-3 text-sm text-gray-800">
                  {lead.message ?? "-"}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                Notes
              </h2>

              <form action={addLeadNote} className="mb-6">
                <input type="hidden" name="leadId" value={lead.id} />

                <textarea
                  name="note"
                  rows={4}
                  placeholder="Add a note..."
                  className="w-full rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-blue-500 text-gray-700"
                />

                <button
                  type="submit"
                  className="mt-3 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
                >
                  Add Note
                </button>
              </form>

              <div className="space-y-3">
                {notes.length === 0 ? (
                  <p className="text-sm text-gray-500">No notes yet.</p>
                ) : (
                  notes.map((note) => (
                    <div
                      key={note.id}
                      className="rounded-lg border border-gray-100 bg-gray-50 p-4"
                    >
                      <p className="text-sm text-gray-800">{note.note}</p>
                      <p className="mt-2 text-xs text-gray-500">
                        {note.created_by ?? "Unknown"} ·{" "}
                        {new Date(note.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                Assigned Agent
              </h2>

              {assignedAgent ? (
                <div className="mb-4 rounded-lg bg-gray-50 p-4">
                  <p className="font-semibold text-gray-900">
                    {assignedAgent.name}
                  </p>

                  <p className="text-sm font-medium text-gray-700">
                    {assignedAgent.email}
                  </p>

                  <p
                    className={
                      assignedAgent.is_online
                        ? "mt-2 text-sm font-semibold text-green-700"
                        : "mt-2 text-sm font-semibold text-gray-600"
                    }
                  >
                    {assignedAgent.is_online ? "Online" : "Offline"}
                  </p>
                </div>
              ) : (
                <p className="mb-4 text-sm font-medium text-gray-700">
                  No agent assigned.
                </p>
              )}

              <form action={assignLeadToAgent}>
                <input type="hidden" name="leadId" value={lead.id} />

                <select
                  key={lead.assigned_agent_id ?? "unassigned"}
                  name="agentId"
                  defaultValue={lead.assigned_agent_id ?? ""}
                  className="w-full rounded-lg border border-gray-300 bg-white p-2 text-sm font-medium text-gray-900 outline-none focus:border-blue-500"
                >
                  <option value="" disabled className="text-gray-500">
                    Select agent
                  </option>
                  {agents.map((agent) => (
                    <option
                      key={agent.id}
                      value={agent.id}
                      disabled={!agent.is_online}
                      className="bg-white text-gray-900"
                    >
                      {agent.name} - {agent.is_online ? "Online" : "Offline"}
                    </option>
                  ))}
                </select>

                <button
                  type="submit"
                  className="mt-3 w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
                >
                  Assign Agent
                </button>
              </form>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                Update Status
              </h2>

              <form action={updateLeadStatus}>
                <input type="hidden" name="leadId" value={lead.id} />
                <input type="hidden" name="oldStatus" value={lead.status} />

                <select
                  key={lead.status}
                  name="status"
                  defaultValue={lead.status}
                  className="w-full rounded-lg border border-gray-300 bg-white p-2 text-sm font-medium text-gray-900 outline-none focus:border-blue-500"
                >
                  {leadStatuses.map((status) => (
                    <option
                      key={status}
                      value={status}
                      className="bg-white text-gray-900"
                    >
                      {status}
                    </option>
                  ))}
                </select>

                <button
                  type="submit"
                  className="mt-3 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
                >
                  Update Status
                </button>
              </form>
            </div>

            <HistoryCard title="Status History">
              {statusHistory.length === 0 ? (
                <p className="text-sm text-gray-500">No status history.</p>
              ) : (
                statusHistory.map((item) => (
                  <div
                    key={item.id}
                    className="border-b border-gray-100 py-3 last:border-b-0"
                  >
                    <p className="text-sm text-gray-800">
                      {item.old_status ?? "-"} → {item.new_status}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {item.changed_by ?? "Unknown"} ·{" "}
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </HistoryCard>

            <HistoryCard title="Assignment History">
              {assignmentHistory.length === 0 ? (
                <p className="text-sm text-gray-500">No assignment history.</p>
              ) : (
                assignmentHistory.map((item) => (
                  <div
                    key={item.id}
                    className="border-b border-gray-100 py-3 last:border-b-0"
                  >
                    <p className="text-sm text-gray-800">
                      {item.agents?.[0]?.name ?? "Unassigned"} (
                      {item.assignment_type})
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {item.reason ?? "-"}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </HistoryCard>
          </aside>
        </div>
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-sm text-gray-900">{value}</p>
    </div>
  );
}

function HistoryCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-2 text-lg font-semibold text-gray-900">{title}</h2>
      {children}
    </div>
  );
}
