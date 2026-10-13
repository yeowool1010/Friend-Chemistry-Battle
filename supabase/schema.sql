create table if not exists public.chemistry_results (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  person_a_name text not null,
  person_b_name text not null,
  person_a_scores jsonb not null,
  person_b_scores jsonb not null,
  overall integer not null,
  grade_label text not null,
  analysis jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.chemistry_results enable row level security;

create table if not exists public.battles (
  id uuid primary key default gen_random_uuid(),
  host_name text not null,
  host_answers jsonb not null,
  host_scores jsonb not null,
  host_token uuid not null,
  guest_name text,
  guest_answers jsonb,
  guest_scores jsonb,
  guest_token uuid,
  overall integer,
  grade_label text,
  analysis jsonb,
  created_at timestamptz not null default now()
);

alter table public.battles enable row level security;
