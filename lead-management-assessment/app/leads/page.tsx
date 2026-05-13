import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";
type AgentRelation =
  | {
      name: string;
      email: string;
    }
  | {
      name: string;
      email: string;
    }[]
  | null;

type LeadRow = {
  id: string;
  external_lead_id: string | null;
  name: string;
  phone: string;
  email: string | null;
  source: string | null;
  project: string | null;
  budget: number | null;
  status: string;
  created_at: string;
  agents: AgentRelation;
};

export default async function LeadsPage() {
  const { data, error } = await supabaseAdmin
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
      status,
      created_at,
      agents (
        name,
        email
      )
    `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-bold">Leads</h1>
        <p className="mt-4 text-red-600">{error.message}</p>
      </main>
    );
  }

  const leads = (data ?? []) as LeadRow[];
  function getAssignedAgent(agents: AgentRelation) {
    if (!agents) return null;

    if (Array.isArray(agents)) {
      return agents[0] ?? null;
    }

    return agents;
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Lead Management
            </h1>
            <p className="mt-1 text-sm text-gray-700">
              View incoming leads, assigned agents, and current status.
            </p>
          </div>

          <Link
            href="/agents"
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Manage Agents
          </Link>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-gray-100 text-xs uppercase text-gray-600">
              <tr>
                <th className="px-4 py-3">Lead</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Budget</th>
                <th className="px-4 py-3">Assigned Agent</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {leads.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-8 text-center text-gray-700"
                  >
                    No leads found.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {lead.name}
                      </div>
                      <div className="text-xs text-gray-700">
                        {lead.external_lead_id ?? "-"}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-gray-700">
                      <div>{lead.phone}</div>
                      <div className="text-xs text-gray-700">
                        {lead.email ?? "-"}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-gray-700">
                      {lead.source ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {lead.project ?? "-"}
                    </td>

                    <td className="px-4 py-3 text-gray-700">
                      {lead.budget
                        ? `RM ${Number(lead.budget).toLocaleString()}`
                        : "-"}
                    </td>

                    <td className="px-4 py-3 text-gray-700">
                      {(() => {
                        const assignedAgent = getAssignedAgent(lead.agents);

                        return assignedAgent ? (
                          <div>
                            <div className="font-medium text-gray-900">
                              {assignedAgent.name}
                            </div>
                            <div className="text-xs text-gray-700">
                              {assignedAgent.email}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-500">Unassigned</span>
                        );
                      })()}
                    </td>

                    <td className="px-4 py-3">
                      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                        {lead.status}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-xs text-gray-700">
                      {new Date(lead.created_at).toLocaleString()}
                    </td>

                    <td className="px-4 py-3">
                      <Link
                        href={`/leads/${lead.id}`}
                        className="text-sm font-medium text-blue-600 hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
