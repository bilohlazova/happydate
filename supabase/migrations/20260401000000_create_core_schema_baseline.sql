-- Local-rebuild baseline for the core tables that predate this repository's
-- first captured migration. Later migrations own all subsequent evolution.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  preferences text,
  avatar_url text,
  points integer default 0,
  created_at timestamptz default now()
);

create table public.people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  relation text,
  birthday date,
  notes text,
  created_at timestamptz default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  date date not null,
  notes text,
  created_at timestamptz default now(),
  category text
);

create table public.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  person_id uuid,
  event_id uuid,
  content_text text,
  audio_url text,
  transcript_text text,
  images text[],
  ai_summary text,
  ai_tags text[],
  ai_emotional_score numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'inactive',
  plan text not null default 'care_monthly',
  source text default 'manual',
  trial_end timestamptz,
  current_period_end timestamptz,
  created_at timestamptz default now(),
  constraint unique_user_subscription unique (user_id)
);

alter table public.memories enable row level security;
create policy "Users can update their memories"
on public.memories for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create or replace function public.expire_trials()
returns void
language plpgsql
as $$ begin return; end $$;

create or replace function public.rls_auto_enable()
returns event_trigger
language plpgsql
as $$ begin return; end $$;
