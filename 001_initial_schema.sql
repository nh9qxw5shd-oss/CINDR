-- ============================================================================
-- CCIL Tracker — Initial Schema
-- Run in Supabase SQL Editor (or via supabase db push)
-- ============================================================================

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type ccil_role as enum (
    'SNDM', 'RCM', 'IC', 'IC2', 'TRC', 'WHTRC', 'ISC', 'TSE'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type ccil_status as enum ('active', 'closed', 'dismissed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ccil_action as enum (
    'claimed', 'released', 'highlighted', 'unhighlighted',
    'dismissed', 'reopened', 'closed', 'first_seen'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Main incidents table — keyed on CCIL incident number
-- ---------------------------------------------------------------------------
create table if not exists public.ccil_incidents (
  incident_number      text primary key,
  start_datetime       timestamptz,
  from_location        text,
  to_location          text,
  title                text,
  fault_number         text,
  tda_numbers          text,
  event_count          int        not null default 0,
  files_count          int        not null default 0,
  recent_event_flag    boolean    not null default false,
  status               ccil_status not null default 'active',
  owner_role           ccil_role,
  owner_taken_at       timestamptz,
  highlighted          boolean    not null default false,
  highlighted_at       timestamptz,
  dismissed_at         timestamptz,
  first_seen_at        timestamptz not null default now(),
  last_seen_at         timestamptz not null default now(),
  raw_payload          jsonb,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists idx_ccil_status         on public.ccil_incidents (status);
create index if not exists idx_ccil_last_seen      on public.ccil_incidents (last_seen_at desc);
create index if not exists idx_ccil_started        on public.ccil_incidents (start_datetime desc);
create index if not exists idx_ccil_owner          on public.ccil_incidents (owner_role) where owner_role is not null;
create index if not exists idx_ccil_highlighted    on public.ccil_incidents (highlighted) where highlighted = true;

-- ---------------------------------------------------------------------------
-- Ownership / action audit log — drives leaderboard
-- ---------------------------------------------------------------------------
create table if not exists public.ccil_ownership_log (
  id              uuid primary key default uuid_generate_v4(),
  incident_number text references public.ccil_incidents(incident_number) on delete cascade,
  role            ccil_role,
  action          ccil_action not null,
  occurred_at     timestamptz not null default now(),
  metadata        jsonb
);

create index if not exists idx_log_incident on public.ccil_ownership_log (incident_number);
create index if not exists idx_log_role     on public.ccil_ownership_log (role, occurred_at desc);
create index if not exists idx_log_action   on public.ccil_ownership_log (action, occurred_at desc);

-- ---------------------------------------------------------------------------
-- Scrape sessions — diagnostic / observability
-- ---------------------------------------------------------------------------
create table if not exists public.ccil_scrape_sessions (
  id              uuid primary key default uuid_generate_v4(),
  scraped_at      timestamptz not null default now(),
  incident_count  int not null default 0,
  filtered_count  int not null default 0,
  closed_count    int not null default 0,
  revived_count   int not null default 0,
  user_agent      text,
  notes           text
);

create index if not exists idx_sessions_scraped on public.ccil_scrape_sessions (scraped_at desc);

-- ---------------------------------------------------------------------------
-- updated_at auto-touch trigger
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_ccil_touch on public.ccil_incidents;
create trigger trg_ccil_touch
  before update on public.ccil_incidents
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Views — for the front-end KPI bar and Insight leaderboard pull
-- ---------------------------------------------------------------------------

-- Live KPI summary (the top bar on the iPad view)
create or replace view public.v_ccil_kpi_summary as
select
  count(*) filter (where status = 'active')                                as total_active,
  count(*) filter (where status = 'active' and owner_role is not null)    as owned,
  count(*) filter (where status = 'active' and owner_role is null)        as unclaimed,
  count(*) filter (where status = 'active' and highlighted)               as highlighted,
  count(*) filter (where status = 'active' and recent_event_flag)         as with_recent_events,
  (
    select extract(epoch from (now() - min(start_datetime)))::int
    from public.ccil_incidents
    where status = 'active' and start_datetime is not null
      and start_datetime < now()
  ) as longest_open_seconds
from public.ccil_incidents;

-- Role leaderboard (for Insight)
create or replace view public.v_ccil_role_leaderboard as
select
  role,
  count(*) filter (where action = 'claimed')      as incidents_claimed,
  count(*) filter (where action = 'dismissed')    as incidents_dismissed,
  count(*) filter (where action = 'highlighted')  as incidents_highlighted,
  count(*) filter (where action = 'released')     as incidents_released,
  count(*)                                        as total_actions,
  max(occurred_at)                                as last_active
from public.ccil_ownership_log
where role is not null
group by role
order by incidents_claimed desc;

-- Active incidents view for front-end (computed duration, all the fields tiles need)
create or replace view public.v_ccil_tiles as
select
  i.*,
  case
    when i.start_datetime is null then null
    when i.start_datetime > now() then 0
    else extract(epoch from (now() - i.start_datetime))::int
  end as duration_seconds
from public.ccil_incidents i
where i.status = 'active';

-- ---------------------------------------------------------------------------
-- Realtime — enable in Supabase dashboard under Database > Replication
-- (toggle ccil_incidents into the supabase_realtime publication)
-- ---------------------------------------------------------------------------
