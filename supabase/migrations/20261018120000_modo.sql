-- MODO accounts and workspaces. The Node server uses the service role key.
-- Row level security is on and no policies are granted, so the anon key cannot read these tables.

create table if not exists public.users (
  id text primary key,
  email text unique not null,
  display_name text not null,
  password_hash text not null,
  verified boolean not null default false,
  created_at bigint not null
);

create table if not exists public.sessions (
  token_hash text primary key,
  user_id text not null references public.users(id) on delete cascade,
  csrf text not null,
  expires_at bigint not null
);
create index if not exists sessions_expiry on public.sessions(expires_at);

create table if not exists public.workspaces (
  user_id text primary key references public.users(id) on delete cascade,
  revision integer not null,
  data jsonb not null,
  updated_at bigint not null
);

create table if not exists public.email_tokens (
  token_hash text primary key,
  user_id text not null references public.users(id) on delete cascade,
  kind text not null,
  expires_at bigint not null
);

alter table public.users enable row level security;
alter table public.sessions enable row level security;
alter table public.workspaces enable row level security;
alter table public.email_tokens enable row level security;
