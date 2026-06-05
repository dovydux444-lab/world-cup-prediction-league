create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.sessions (
  token text primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  stage text not null default 'World Cup 2026',
  home_team text not null,
  away_team text not null,
  kickoff_utc timestamptz not null,
  venue text not null default '',
  status text not null default 'scheduled',
  home_score integer,
  away_score integer,
  updated_at timestamptz not null default now()
);

create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  home_score integer not null check (home_score >= 0),
  away_score integer not null check (away_score >= 0),
  points integer not null default 0,
  exact integer not null default 0,
  winner integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, match_id)
);

create table if not exists public.bonus_predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null,
  team text not null,
  awarded boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, type)
);

create table if not exists public.sync_log (
  id bigint generated always as identity primary key,
  provider text not null,
  ok boolean not null,
  message text not null,
  created_at timestamptz not null default now()
);

insert into public.users (username, password_hash, is_admin)
values
  ('admin67', '19088813086efb31801b7a4823936a84:d88e6e455b31b087718d3e005a6e1a23477d353ce529249b5660681065d054e3d91ffc2f3572b7d6c51a3d9f23c86dfcde162961b121af30e424d57c55f6f001', true)
on conflict (username) do nothing;

insert into public.matches (stage, home_team, away_team, kickoff_utc, venue, status, home_score, away_score)
values
  ('Demo', 'Prancūzija', 'Marokas', now() - interval '2 hours', 'Demo stadionas', 'finished', 2, 1),
  ('Demo', 'Brazilija', 'Kroatija', now() + interval '6 hours', 'Demo stadionas', 'scheduled', null, null),
  ('Demo', 'Argentina', 'Japonija', now() + interval '1 day', 'Demo stadionas', 'scheduled', null, null)
on conflict do nothing;
