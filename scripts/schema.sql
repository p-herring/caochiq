-- ============================================================
-- CoachIQ Database Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── Coach Profiles ───────────────────────────────────────────────────────────
create table if not exists coach_profiles (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references auth.users(id) on delete cascade not null unique,
  full_name   text not null,
  email       text not null,
  created_at  timestamptz default now() not null
);

-- ─── Athletes ─────────────────────────────────────────────────────────────────
create table if not exists athletes (
  id          uuid primary key default uuid_generate_v4(),
  coach_id    uuid references auth.users(id) on delete cascade not null,
  user_id     uuid references auth.users(id) on delete set null,
  full_name   text not null,
  email       text not null,
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null
);

create index if not exists athletes_coach_id_idx on athletes(coach_id);

-- ─── Athlete Profiles ─────────────────────────────────────────────────────────
create table if not exists athlete_profiles (
  id          uuid primary key default uuid_generate_v4(),
  athlete_id  uuid references athletes(id) on delete cascade not null unique,
  dob         date,
  weight_kg   numeric(5,2),
  timezone    text default 'UTC',
  goals       text,
  notes       text,
  sports      text[] default '{}',
  updated_at  timestamptz default now() not null
);

-- ─── Races ────────────────────────────────────────────────────────────────────
create table if not exists races (
  id          uuid primary key default uuid_generate_v4(),
  athlete_id  uuid references athletes(id) on delete cascade not null,
  name        text not null,
  event_date  date not null,
  distance    text,
  location    text,
  priority    text default 'B' check (priority in ('A', 'B', 'C')),
  created_at  timestamptz default now() not null
);

create index if not exists races_athlete_id_idx on races(athlete_id);
create index if not exists races_event_date_idx on races(event_date);

-- ─── Training Plans ───────────────────────────────────────────────────────────
create table if not exists training_plans (
  id          uuid primary key default uuid_generate_v4(),
  athlete_id  uuid references athletes(id) on delete cascade not null,
  coach_id    uuid references auth.users(id) on delete cascade not null,
  name        text not null,
  start_date  date not null,
  end_date    date,
  is_active   boolean default true not null,
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null
);

create index if not exists training_plans_athlete_id_idx on training_plans(athlete_id);
create index if not exists training_plans_coach_id_idx on training_plans(coach_id);

-- ─── Sessions ─────────────────────────────────────────────────────────────────
create table if not exists sessions (
  id           uuid primary key default uuid_generate_v4(),
  plan_id      uuid references training_plans(id) on delete cascade not null,
  athlete_id   uuid references athletes(id) on delete cascade not null,
  coach_id     uuid references auth.users(id) on delete cascade not null,
  date         date not null,
  type         text not null check (type in ('swim','bike','run','strength','rest','other')),
  title        text not null,
  description  text,
  duration_min integer,
  tss          numeric(6,2),
  status       text default 'scheduled' check (status in ('scheduled','completed','missed','skipped')),
  position     integer default 0 not null,
  created_at   timestamptz default now() not null,
  updated_at   timestamptz default now() not null
);

create index if not exists sessions_plan_id_idx on sessions(plan_id);
create index if not exists sessions_athlete_id_idx on sessions(athlete_id);
create index if not exists sessions_date_idx on sessions(date);

-- ─── Workout Blocks ───────────────────────────────────────────────────────────
create table if not exists workout_blocks (
  id           uuid primary key default uuid_generate_v4(),
  session_id   uuid references sessions(id) on delete cascade not null,
  position     integer default 0 not null,
  type         text not null check (type in ('warmup','interval','steady','cooldown','rest','note')),
  description  text not null,
  duration_min integer,
  distance_m   integer,
  intensity    text,
  reps         integer,
  created_at   timestamptz default now() not null
);

create index if not exists workout_blocks_session_id_idx on workout_blocks(session_id);

-- ─── Workout Logs ─────────────────────────────────────────────────────────────
create table if not exists workout_logs (
  id                  uuid primary key default uuid_generate_v4(),
  athlete_id          uuid references athletes(id) on delete cascade not null,
  session_id          uuid references sessions(id) on delete set null,
  date                date not null,
  type                text not null check (type in ('swim','bike','run','strength','rest','other')),
  session_name        text,
  duration_min        integer,
  distance_m          integer,
  avg_hr              integer,
  max_hr              integer,
  avg_power           integer,
  normalized_power    integer,
  tss                 numeric(6,2),
  rpe                 integer check (rpe >= 1 and rpe <= 10),
  status              text default 'completed' check (status in ('scheduled','completed','missed','skipped')),
  notes               text,
  strava_activity_id  text unique,
  source              text default 'manual' check (source in ('manual','strava','garmin')),
  created_at          timestamptz default now() not null
);

create index if not exists workout_logs_athlete_id_idx on workout_logs(athlete_id);
create index if not exists workout_logs_date_idx on workout_logs(date);
create index if not exists workout_logs_strava_id_idx on workout_logs(strava_activity_id);

-- ─── Insights ─────────────────────────────────────────────────────────────────
create table if not exists insights (
  id          uuid primary key default uuid_generate_v4(),
  athlete_id  uuid references athletes(id) on delete cascade not null,
  coach_id    uuid references auth.users(id) on delete cascade not null,
  type        text not null check (type in ('compliance','missed_sessions','fatigue','weight_trend','overtraining','race_approaching')),
  severity    text default 'info' check (severity in ('info','warning','critical')),
  message     text not null,
  coach_note  text,
  dismissed   boolean default false not null,
  created_at  timestamptz default now() not null
);

create index if not exists insights_athlete_id_idx on insights(athlete_id);
create index if not exists insights_coach_id_idx on insights(coach_id);
create index if not exists insights_dismissed_idx on insights(dismissed);

-- ─── Messages ─────────────────────────────────────────────────────────────────
create table if not exists messages (
  id           uuid primary key default uuid_generate_v4(),
  sender_id    uuid references auth.users(id) on delete cascade not null,
  recipient_id uuid references auth.users(id) on delete cascade not null,
  body         text not null,
  read         boolean default false not null,
  created_at   timestamptz default now() not null
);

create index if not exists messages_sender_id_idx on messages(sender_id);
create index if not exists messages_recipient_id_idx on messages(recipient_id);
create index if not exists messages_created_at_idx on messages(created_at);

-- ─── Strava Integrations ──────────────────────────────────────────────────────
create table if not exists strava_integrations (
  id                  uuid primary key default uuid_generate_v4(),
  athlete_id          uuid references athletes(id) on delete cascade not null unique,
  strava_athlete_id   text not null,
  access_token        text not null,
  refresh_token       text not null,
  expires_at          bigint not null,
  scope               text not null,
  created_at          timestamptz default now() not null,
  updated_at          timestamptz default now() not null
);

-- ─── Updated_at triggers ──────────────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger athletes_updated_at before update on athletes
  for each row execute function update_updated_at();
create trigger training_plans_updated_at before update on training_plans
  for each row execute function update_updated_at();
create trigger sessions_updated_at before update on sessions
  for each row execute function update_updated_at();
create trigger strava_integrations_updated_at before update on strava_integrations
  for each row execute function update_updated_at();

-- ─── Row Level Security ───────────────────────────────────────────────────────
alter table coach_profiles enable row level security;
alter table athletes enable row level security;
alter table athlete_profiles enable row level security;
alter table races enable row level security;
alter table training_plans enable row level security;
alter table sessions enable row level security;
alter table workout_blocks enable row level security;
alter table workout_logs enable row level security;
alter table insights enable row level security;
alter table messages enable row level security;
alter table strava_integrations enable row level security;

-- Coach profiles: own row only
create policy "coach_profiles_own" on coach_profiles
  using (auth.uid() = user_id);

-- Athletes: coach sees their athletes
create policy "athletes_coach" on athletes
  using (auth.uid() = coach_id);

-- Athlete profiles: coach sees their athletes' profiles
create policy "athlete_profiles_coach" on athlete_profiles
  using (exists (
    select 1 from athletes where athletes.id = athlete_profiles.athlete_id
    and athletes.coach_id = auth.uid()
  ));

-- Races: coach sees their athletes' races
create policy "races_coach" on races
  using (exists (
    select 1 from athletes where athletes.id = races.athlete_id
    and athletes.coach_id = auth.uid()
  ));

-- Training plans: own
create policy "training_plans_coach" on training_plans
  using (auth.uid() = coach_id);

-- Sessions: own
create policy "sessions_coach" on sessions
  using (auth.uid() = coach_id);

-- Workout blocks: via session
create policy "workout_blocks_coach" on workout_blocks
  using (exists (
    select 1 from sessions where sessions.id = workout_blocks.session_id
    and sessions.coach_id = auth.uid()
  ));

-- Workout logs: coach sees their athletes' logs
create policy "workout_logs_coach" on workout_logs
  using (exists (
    select 1 from athletes where athletes.id = workout_logs.athlete_id
    and athletes.coach_id = auth.uid()
  ));

-- Insights: own
create policy "insights_coach" on insights
  using (auth.uid() = coach_id);

-- Messages: sender or recipient
create policy "messages_own" on messages
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

-- Strava: coach via athlete
create policy "strava_coach" on strava_integrations
  using (exists (
    select 1 from athletes where athletes.id = strava_integrations.athlete_id
    and athletes.coach_id = auth.uid()
  ));

-- ─── Auto-create athlete profile on athlete insert ────────────────────────────
create or replace function create_athlete_profile()
returns trigger as $$
begin
  insert into athlete_profiles (athlete_id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_athlete_created after insert on athletes
  for each row execute function create_athlete_profile();

-- ─── Auto-create coach profile on signup ─────────────────────────────────────
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into coach_profiles (user_id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();
