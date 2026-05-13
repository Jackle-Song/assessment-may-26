# Lead Management Mini System

## Overview

This is a small lead intake and lead management system built for the take-home assessment.

The system receives incoming lead data from an external source, validates the request, stores the lead in Supabase, assigns the lead to an available agent using round-robin logic, and provides a simple internal interface for viewing and managing leads.

## Tech Stack

- Next.js
- TypeScript
- Supabase PostgreSQL
- Tailwind CSS
- Server Actions
- Supabase JavaScript Client

## Main Features

- Incoming lead API endpoint
- Simple token validation for incoming requests
- Payload validation
- Duplicate lead detection by phone and email
- Lead storage in Supabase
- Raw incoming payload logging
- Lead list page
- Lead detail page
- Lead status update
- Manual lead assignment
- Lead notes
- Agent online/offline management
- Round-robin assignment across online agents
- Offline agents are skipped automatically
- Assignment history
- Notification records when leads are assigned

## Pages

| Page | Description |
|---|---|
| `/` | Dashboard / system overview |
| `/leads` | View all incoming leads |
| `/leads/[id]` | View lead details, update status, assign agent, add notes |
| `/agents` | Manage agent online/offline availability |

## API Endpoints

### `POST /api/leads/incoming`

Receives incoming lead data from an external source.

### Headers

```http
Content-Type: application/json
x-api-token: lead-assessment-secret-token
```

### Sample Request

```json
{
  "leadId": "LD1001",
  "name": "John Tan",
  "phone": "0123456789",
  "email": "john@email.com",
  "source": "Facebook Ads",
  "project": "Residensi Mutiara",
  "budget": 650000,
  "message": "Interested in 3-bedroom unit",
  "createdAt": "2026-04-20T10:30:00Z"
}
```

### Success Response

```json
{
  "success": true,
  "message": "Lead received and assigned successfully.",
  "leadId": "generated-lead-id",
  "assignedAgent": {
    "id": "agent-id",
    "name": "Agent A",
    "email": "agent.a@example.com"
  }
}
```

### Possible Error Responses

| Status | Description |
|---|---|
| 400 | Invalid JSON or missing required payload fields |
| 401 | Invalid or missing API token |
| 409 | Duplicate lead detected by phone/email |
| 500 | Unexpected server/database error |

## Database Tables

| Table | Purpose |
|---|---|
| `agents` | Stores agent information and online/offline status |
| `leads` | Stores lead information and current assigned agent |
| `lead_notes` | Stores notes added by internal users |
| `lead_status_history` | Tracks lead status changes |
| `lead_assignment_history` | Tracks auto/manual assignment history |
| `lead_incoming_events` | Stores raw incoming payload logs |
| `notifications` | Stores notification records for assigned agents |
| `assignment_state` | Stores last assigned agent for round-robin continuation |

Full schema is available in:

```txt
docs/database-schema.sql
```

## Round-Robin Assignment Logic

When a new valid lead is received, the system:

1. Gets all active online agents ordered by `assignment_order`.
2. Reads `assignment_state.last_assigned_agent_id`.
3. Selects the next online agent after the last assigned agent.
4. Skips offline agents automatically.
5. If the last assigned agent is offline or no longer eligible, the system continues from the first available online agent.
6. Saves the selected agent into the lead record.
7. Inserts an assignment history record.
8. Creates a notification record.
9. Updates `assignment_state` so the next lead continues from the correct agent.

Example:

```txt
Online agents: Agent A, Agent B, Agent C

Lead 1 -> Agent A
Lead 2 -> Agent B
Lead 3 -> Agent C

If Agent B goes offline:
Next leads continue between Agent A and Agent C.

If Agent D comes online:
Agent D is included in the assignment cycle based on assignment order.
```

## Manual Assignment Logic

Internal users can manually assign a lead to an agent from the lead detail page.

For this implementation:

- Offline agents are shown in the dropdown.
- Offline agents are disabled in the UI.
- Backend validation also blocks assignment to offline agents.
- Manual assignments create assignment history and notification records.

## Setup Instructions

### 1. Clone the repository

```bash
git clone <repo-url>
cd <project-folder>
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create environment file

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
INCOMING_LEAD_TOKEN=lead-assessment-secret-token
```

### 4. Create Supabase database tables

Open Supabase SQL Editor and run the SQL from:

```txt
docs/database-schema.sql
```

### 5. Run the development server

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
```

## Testing Incoming API

Use curl:

```bash
curl -X POST http://localhost:3000/api/leads/incoming \
  -H "Content-Type: application/json" \
  -H "x-api-token: lead-assessment-secret-token" \
  -d "{\"leadId\":\"LD1001\",\"name\":\"John Tan\",\"phone\":\"0123456789\",\"email\":\"john@email.com\",\"source\":\"Facebook Ads\",\"project\":\"Residensi Mutiara\",\"budget\":650000,\"message\":\"Interested in 3-bedroom unit\",\"createdAt\":\"2026-04-20T10:30:00Z\"}"
```

Then check:

```txt
http://localhost:3000/leads
```

## Testing Round-Robin Assignment

### Step 1: Set agents online/offline

Go to:

```txt
http://localhost:3000/agents
```

Set:

```txt
Agent A = Online
Agent B = Online
Agent C = Online
Agent D = Offline
```

### Step 2: Reset round-robin state

In Supabase SQL Editor:

```sql
update assignment_state
set last_assigned_agent_id = null,
    updated_at = now()
where id = 1;
```

### Step 3: Send test leads

Send multiple leads with different phone/email values.

Expected assignment:

```txt
Lead 1 -> Agent A
Lead 2 -> Agent B
Lead 3 -> Agent C
```

### Step 4: Test offline skip

Set Agent B offline.

Send another lead.

Expected:

```txt
Agent B should be skipped.
The lead should be assigned to the next available online agent.
```

### Step 5: Test agent coming online

Set Agent D online.

Send another lead.

Expected:

```txt
Agent D is included in the assignment cycle.
```

## Useful SQL for Verification

### Assignment history

```sql
select
  l.external_lead_id,
  l.name as lead_name,
  a.name as assigned_agent,
  lah.assignment_type,
  lah.reason,
  lah.created_at
from lead_assignment_history lah
join leads l on l.id = lah.lead_id
left join agents a on a.id = lah.assigned_agent_id
order by lah.created_at desc;
```

### Notifications

```sql
select
  l.external_lead_id,
  a.name as agent_name,
  n.message,
  n.is_read,
  n.created_at
from notifications n
join leads l on l.id = n.lead_id
left join agents a on a.id = n.agent_id
order by n.created_at desc;
```

### Incoming event logs

```sql
select
  external_lead_id,
  phone,
  email,
  status,
  error_message,
  created_at
from lead_incoming_events
order by created_at desc;
```

## Assumptions and Design Decisions

- A simple API token is used to validate incoming requests.
- Phone number and email are used to detect duplicate leads.
- Supabase is used as the main database.
- The `service_role` key is used only on the server side.
- Agents have an `assignment_order` value to support predictable round-robin assignment.
- Only online and active agents are eligible for automatic assignment.
- Manual assignment also blocks offline agents for consistency.
- Raw incoming payloads are stored for audit and troubleshooting.
- Notification records are stored in the database instead of sending real push/email notifications.
- This is not designed as a production-ready CRM, but as a clean and practical mini system for assessment purposes.

## Folder Structure

```txt
app/
  api/
    leads/
      incoming/
        route.ts
  agents/
    actions.ts
    page.tsx
  leads/
    [id]/
      actions.ts
      page.tsx
    page.tsx
  page.tsx

lib/
  supabase/
    admin.ts
    client.ts

docs/
  database-schema.sql
  flowchart.md
```

## Future Improvements

Given more time, the system can be extended with:

- Authentication for internal users
- Role-based access control
- Real-time lead updates using Supabase Realtime
- Agent workload dashboard
- Notification delivery through email or WhatsApp
- Search and filtering
- Pagination
- Retry handling for failed webhook events
- More detailed audit logs
