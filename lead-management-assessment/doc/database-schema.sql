-- Supabase database schema for Lead Management Mini System

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Agents table
create table if not exists agents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  is_online boolean not null default false,
  is_active boolean not null default true,
  assignment_order int not null,
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);

-- Leads table
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  external_lead_id text,
  name text not null,
  phone text not null,
  email text,
  source text,
  project text,
  budget numeric,
  message text,
  status text not null default 'new',
  assigned_agent_id uuid references agents(id),
  incoming_created_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Raw incoming payload / webhook log
create table if not exists lead_incoming_events (
  id uuid primary key default gen_random_uuid(),
  external_lead_id text,
  phone text,
  email text,
  raw_payload jsonb not null,
  status text not null,
  error_message text,
  lead_id uuid references leads(id),
  created_at timestamptz not null default now()
);

-- Lead notes
create table if not exists lead_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  note text not null,
  created_by text,
  created_at timestamptz not null default now()
);

-- Lead status history
create table if not exists lead_status_history (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  old_status text,
  new_status text not null,
  changed_by text,
  created_at timestamptz not null default now()
);

-- Lead assignment history
create table if not exists lead_assignment_history (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  assigned_agent_id uuid references agents(id),
  assignment_type text not null default 'round_robin',
  reason text,
  created_at timestamptz not null default now()
);

-- Notification records
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references agents(id),
  lead_id uuid references leads(id) on delete cascade,
  type text not null default 'lead_assigned',
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Round-robin state
create table if not exists assignment_state (
  id int primary key default 1,
  last_assigned_agent_id uuid references agents(id),
  updated_at timestamptz not null default now(),
  constraint only_one_assignment_state check (id = 1)
);

-- Insert initial round-robin state
insert into assignment_state (id)
values (1)
on conflict (id) do nothing;

-- Seed sample agents
insert into agents (name, email, is_online, is_active, assignment_order)
values
  ('Agent A', 'agent.a@example.com', true, true, 1),
  ('Agent B', 'agent.b@example.com', true, true, 2),
  ('Agent C', 'agent.c@example.com', true, true, 3),
  ('Agent D', 'agent.d@example.com', false, true, 4)
on conflict (email) do nothing;

-- Helpful indexes
create index if not exists idx_leads_phone on leads(phone);
create index if not exists idx_leads_email on leads(email);
create index if not exists idx_leads_status on leads(status);
create index if not exists idx_leads_assigned_agent_id on leads(assigned_agent_id);
create index if not exists idx_agents_online_active on agents(is_online, is_active);
