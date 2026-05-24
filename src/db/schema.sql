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

create table if not exists watchlist_configs (
  id serial primary key,
  target_size integer not null default 10 check (target_size between 5 and 10),
  manual_override_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table watchlist_configs add column if not exists manual_override_enabled boolean not null default false;

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

create table if not exists lq45_universe_snapshots (
  id bigserial primary key,
  source text not null,
  symbol_set_hash text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists lq45_universe_symbols (
  id bigserial primary key,
  snapshot_id bigint not null references lq45_universe_snapshots(id) on delete cascade,
  symbol text not null,
  unique(snapshot_id, symbol)
);

create table if not exists watchlists (
  id bigserial primary key,
  run_id bigint references job_runs(id) on delete set null,
  target_size integer not null,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists watchlist_symbols (
  id bigserial primary key,
  watchlist_id bigint not null references watchlists(id) on delete cascade,
  symbol text not null,
  rank integer not null,
  score numeric(12,4) not null,
  score_detail jsonb not null default '{}'::jsonb,
  unique(watchlist_id, symbol)
);

create table if not exists market_data_daily (
  id bigserial primary key,
  trade_date date not null,
  symbol text not null,
  provider text not null,
  open numeric(16,4) not null,
  high numeric(16,4) not null,
  low numeric(16,4) not null,
  close numeric(16,4) not null,
  volume bigint not null,
  created_at timestamptz not null default now(),
  unique(trade_date, symbol)
);

create table if not exists indicator_daily (
  id bigserial primary key,
  trade_date date not null,
  symbol text not null,
  name text not null,
  value numeric(16,6) not null,
  created_at timestamptz not null default now(),
  unique(trade_date, symbol, name)
);

create table if not exists sentiment_daily (
  id bigserial primary key,
  trade_date date not null,
  symbol text not null,
  provider text not null,
  headline_count integer not null,
  sentiment_score numeric(8,4) not null,
  created_at timestamptz not null default now(),
  unique(trade_date, symbol)
);

create table if not exists ai_watchlist_decisions (
  id bigserial primary key,
  run_id bigint not null references job_runs(id) on delete cascade,
  symbol text not null,
  decision text not null check (decision in ('INCLUDE','EXCLUDE')),
  confidence numeric(8,6) not null,
  rank_hint integer not null,
  rationale text not null,
  risk_flags jsonb not null default '[]'::jsonb,
  debate_trace jsonb not null default '{}'::jsonb,
  provider text not null,
  model text not null,
  raw_response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(run_id, symbol)
);

create table if not exists data_fetch_errors (
  id bigserial primary key,
  run_id bigint references job_runs(id) on delete set null,
  trade_date date not null,
  symbol text not null,
  data_type text not null,
  provider text not null,
  error_code text not null,
  message text not null,
  retryable boolean not null default true,
  created_at timestamptz not null default now()
);
