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

grant select, insert on public.chemistry_results to anon, authenticated;

drop policy if exists "chemistry_results_insert" on public.chemistry_results;
create policy "chemistry_results_insert"
  on public.chemistry_results
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "chemistry_results_select" on public.chemistry_results;
create policy "chemistry_results_select"
  on public.chemistry_results
  for select
  to anon, authenticated
  using (true);
