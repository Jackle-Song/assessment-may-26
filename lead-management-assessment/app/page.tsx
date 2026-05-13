import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";

export default async function HomePage() {
  const [
    { count: totalLeads },
    { count: newLeads },
    { count: onlineAgents },
    { count: notifications },
  ] = await Promise.all([
    supabaseAdmin.from("leads").select("*", { count: "exact", head: true }),
    supabaseAdmin
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("status", "new"),
    supabaseAdmin
      .from("agents")
      .select("*", { count: "exact", head: true })
      .eq("is_online", true)
      .eq("is_active", true),
    supabaseAdmin
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("is_read", false),
  ]);

  const { data: recentLeads } = await supabaseAdmin
    .from("leads")
    .select(
      `
      id,
      name,
      phone,
      status,
      created_at,
      agents (
        name,
        email
      )
    `,
    )
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <main className="min-h-screen bg-gray-50 p-8 text-gray-900">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-950">
            Lead Management Mini System
          </h1>
          <p className="mt-2 text-sm font-medium text-gray-700">
            Incoming lead API, Supabase storage, round-robin assignment, agent
            availability, notes, status updates, and notification records.
          </p>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard title="Total Leads" value={totalLeads ?? 0} />
          <SummaryCard title="New Leads" value={newLeads ?? 0} />
          <SummaryCard title="Online Agents" value={onlineAgents ?? 0} />
          <SummaryCard
            title="Unread Notifications"
            value={notifications ?? 0}
          />
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          <Link
            href="/leads"
            className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:bg-gray-50"
          >
            <h2 className="text-lg font-semibold text-gray-950">
              Lead Management
            </h2>
            <p className="mt-2 text-sm font-medium text-gray-700">
              View leads, check assigned agents, update status, add notes, and
              manually reassign leads.
            </p>
          </Link>

          <Link
            href="/agents"
            className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:bg-gray-50"
          >
            <h2 className="text-lg font-semibold text-gray-950">
              Agent Management
            </h2>
            <p className="mt-2 text-sm font-medium text-gray-700">
              Toggle agent online/offline status and test round-robin lead
              distribution.
            </p>
          </Link>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-950">
              Recent Leads
            </h2>

            <Link
              href="/leads"
              className="text-sm font-semibold text-blue-700 hover:underline"
            >
              View all
            </Link>
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-100">
            <table className="w-full text-left text-sm text-gray-800">
              <thead className="bg-gray-100 text-xs uppercase text-gray-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">Lead</th>
                  <th className="px-4 py-3 font-semibold">Phone</th>
                  <th className="px-4 py-3 font-semibold">Agent</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {(recentLeads ?? []).length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center font-medium text-gray-600"
                    >
                      No recent leads found.
                    </td>
                  </tr>
                ) : (
                  (recentLeads ?? []).map((lead) => {
                    const assignedAgent = Array.isArray(lead.agents)
                      ? lead.agents[0]
                      : lead.agents;

                    return (
                      <tr key={lead.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-semibold text-gray-950">
                          {lead.name}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-800">
                          {lead.phone}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-800">
                          {assignedAgent?.name ?? "Unassigned"}
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
                            {lead.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-gray-700">
                          {new Date(lead.created_at).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}

function SummaryCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold text-gray-700">{title}</p>
      <p className="mt-2 text-3xl font-bold text-gray-950">{value}</p>
    </div>
  );
}
