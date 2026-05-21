create table if not exists provider_profiles (
  id serial primary key,
  name text not null,
  provider text not null check (provider in ('groq','openrouter')),
  model text not null,
  api_base text not null,
  api_key text not null,
  temperature numeric(4,2) not null default 0.2,
  max_tokens integer not null default 1024,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists schedule_configs (
  id serial primary key,
  timezone text not null default 'Asia/Jakarta',
  daily_enabled boolean not null default true,
  daily_time text not null default '09:00',
  weekdays text[] not null default array['MON','TUE','WED','THU','FRI'],
  weekly_enabled boolean not null default true,
  weekly_day text not null default 'SUN',
  updated_at timestamptz not null default now()
);

create table if not exists job_runs (
  id bigserial primary key,
  run_type text not null check (run_type in ('daily','weekly')),
  trigger_type text not null check (trigger_type in ('manual','scheduled')),
  status text not null check (status in ('queued','running','succeeded','failed','skipped_overlap','canceled')),
  effective_config jsonb not null,
  started_at timestamptz,
  finished_at timestamptz,
  duration_ms integer,
  created_at timestamptz not null default now()
);

create table if not exists job_run_errors (
  id bigserial primary key,
  run_id bigint not null references job_runs(id) on delete cascade,
  code text not null,
  message text not null,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
