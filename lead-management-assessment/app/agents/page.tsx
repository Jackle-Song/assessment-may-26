import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { addAgent, toggleAgentPresence } from "./actions";

type Agent = {
  id: string;
  name: string;
  email: string;
  is_online: boolean;
  is_active: boolean;
  assignment_order: number;
  last_seen_at: string | null;
  created_at: string;
};

export default async function AgentsPage() {
  const { data, error } = await supabaseAdmin
    .from("agents")
    .select(
      "id, name, email, is_online, is_active, assignment_order, last_seen_at, created_at",
    )
    .order("assignment_order", { ascending: true });

  if (error) {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-bold">Agents</h1>
        <p className="mt-4 text-red-600">{error.message}</p>
      </main>
    );
  }

  const agents = (data ?? []) as Agent[];

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <Link
            href="/leads"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            ← Back to Leads
          </Link>

          <div className="mt-4">
            <h1 className="text-3xl font-bold text-gray-900">
              Agent Management
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage agent availability for round-robin lead assignment.
            </p>
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Add Agent
          </h2>

          <form action={addAgent} className="grid gap-3 sm:grid-cols-3">
            <input
              name="name"
              placeholder="Agent name"
              className="rounded-lg border border-gray-300 p-2 text-sm outline-none focus:border-blue-500 text-gray-700"
            />

            <input
              name="email"
              type="email"
              placeholder="agent@email.com"
              className="rounded-lg border border-gray-300 p-2 text-sm outline-none focus:border-blue-500 text-gray-700"
            />

            <button
              type="submit"
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              Add Agent
            </button>
          </form>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-gray-100 text-xs uppercase text-gray-600">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Agent</th>
                <th className="px-4 py-3">Availability</th>
                <th className="px-4 py-3">Last Seen</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {agents.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    No agents found.
                  </td>
                </tr>
              ) : (
                agents.map((agent) => (
                  <tr key={agent.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700">
                      {agent.assignment_order}
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {agent.name}
                      </div>
                      <div className="text-xs text-gray-500">{agent.email}</div>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={
                          agent.is_online
                            ? "rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700"
                            : "rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500"
                        }
                      >
                        {agent.is_online ? "Online" : "Offline"}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-xs text-gray-500">
                      {agent.last_seen_at
                        ? new Date(agent.last_seen_at).toLocaleString()
                        : "-"}
                    </td>

                    <td className="px-4 py-3">
                      <form action={toggleAgentPresence}>
                        <input type="hidden" name="agentId" value={agent.id} />
                        <input
                          type="hidden"
                          name="currentStatus"
                          value={String(agent.is_online)}
                        />

                        <button
                          type="submit"
                          className={
                            agent.is_online
                              ? "rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
                              : "rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500"
                          }
                        >
                          {agent.is_online ? "Set Offline" : "Set Online"}
                        </button>
                      </form>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
          <p className="font-medium">Round-robin testing tip</p>
          <p className="mt-1">
            Set Agent A, B, and C online, then send several incoming lead API
            requests. The assignment should rotate A → B → C. Then set B offline
            and send again. The next assignments should continue only between A
            and C.
          </p>
        </div>
      </div>
    </main>
  );
}
