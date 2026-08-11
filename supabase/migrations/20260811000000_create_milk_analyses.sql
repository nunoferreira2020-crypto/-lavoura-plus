create table if not exists public.milk_analyses (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null,
  analysis_date date not null,
  fat numeric(6, 2) not null check (fat >= 0),
  protein numeric(6, 2) not null check (protein >= 0),
  somatic_cells integer not null check (somatic_cells >= 0),
  cfu integer not null check (cfu >= 0),
  notes text check (char_length(notes) <= 2000),
  created_at timestamptz not null default now()
);

create index if not exists milk_analyses_farm_date_idx
  on public.milk_analyses (farm_id, analysis_date desc, created_at desc);

alter table public.milk_analyses enable row level security;

create policy "Authenticated users can read milk analyses"
  on public.milk_analyses for select
  to authenticated
  using (true);

create policy "Authenticated users can add milk analyses"
  on public.milk_analyses for insert
  to authenticated
  with check (true);
