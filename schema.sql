-- SmartRecovery AI — PostgreSQL / Supabase schema
-- The prototype ledger mirrors these tables. Apply this file in Supabase
-- when you are ready to move off the embedded JSON ledger.

create table if not exists users (
  id text primary key,
  name text not null,
  email text not null unique,
  role text not null check (role in ('admin', 'operator')),
  created_at timestamptz not null default now()
);

create table if not exists customers (
  id text primary key,
  name text not null,
  email text not null,
  company text,
  paypal_payer_id text unique,
  risk_score integer not null default 0,
  segment text,
  created_at timestamptz not null default now()
);

create table if not exists transactions (
  id text primary key,
  display_id text not null unique,
  customer_id text not null references customers(id),
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null default 'USD',
  status text not null check (status in (
    'completed', 'failed', 'refunded', 'approved', 'approved_uncaptured', 'recovered'
  )),
  event_type text not null,
  failure_code text,
  failure_reason text,
  payment_method text,
  subscription_id text,
  order_id text,
  capture_id text,
  recovered_amount numeric(12, 2) not null default 0,
  approved_at timestamptz,
  recovered_at timestamptz,
  retry_at timestamptz,
  pipeline_ran boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists payment_events (
  id text primary key,
  transaction_id text references transactions(id),
  event_type text not null,
  payload jsonb not null,
  signature_status text not null check (signature_status in ('verified', 'simulated', 'rejected')),
  received_at timestamptz not null default now()
);

create table if not exists ai_diagnoses (
  id text primary key,
  transaction_id text not null references transactions(id),
  root_cause text not null,
  explanation text not null,
  category text not null,
  category_label text not null,
  risk_level text not null check (risk_level in ('low', 'medium', 'high')),
  recovery_probability numeric(4, 3) not null,
  recommended_action text not null,
  uncertainty text not null check (uncertainty in ('low', 'medium', 'high')),
  verified_facts jsonb not null,
  hypotheses jsonb not null,
  suggested_message text,
  model text not null,
  policy_locked boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists recovery_actions (
  id text primary key,
  transaction_id text not null references transactions(id),
  type text not null,
  status text not null check (status in (
    'pending', 'processing', 'completed', 'failed', 'escalated', 'pending_approval', 'rejected'
  )),
  idempotency_key text not null unique,
  requires_approval boolean not null default false,
  checks jsonb not null,
  result jsonb,
  error text,
  actor text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists customer_messages (
  id text primary key,
  transaction_id text not null references transactions(id),
  customer_id text not null references customers(id),
  action_id text references recovery_actions(id),
  channel text not null default 'email',
  subject text not null,
  body text not null,
  status text not null check (status in ('draft', 'sent', 'failed')),
  delivery_detail text,
  ai_generated boolean not null default true,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create table if not exists human_reviews (
  id text primary key,
  transaction_id text not null references transactions(id),
  action_id text references recovery_actions(id),
  reason text not null,
  reason_label text not null,
  status text not null check (status in ('open', 'approved', 'rejected', 'resolved')),
  notes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists audit_logs (
  id text primary key,
  actor text not null,
  action text not null,
  entity_type text not null,
  entity_id text,
  decision text not null check (decision in ('allow', 'block', 'hold', 'info')),
  details text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_transactions_customer on transactions(customer_id);
create index if not exists idx_transactions_status on transactions(status);
create index if not exists idx_transactions_created on transactions(created_at desc);
create index if not exists idx_actions_txn on recovery_actions(transaction_id);
create index if not exists idx_messages_txn on customer_messages(transaction_id);
create index if not exists idx_reviews_status on human_reviews(status);
create index if not exists idx_audit_created on audit_logs(created_at desc);
