-- Otimizações de desempenho para o carregamento da Lavoura+
create index if not exists finance_records_farm_date_idx
  on public.finance_records (farm_id, record_date desc);

create index if not exists budget_items_farm_active_category_idx
  on public.budget_items (farm_id, active, category);

-- Este índice era duplicado de milk_records_farm_id_record_date_key.
drop index if exists public.milk_records_farm_record_date_uidx;
