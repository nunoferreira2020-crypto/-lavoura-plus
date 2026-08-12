-- Lavoura+ v1 security hardening.
-- These trigger/helper functions run with elevated privileges and are not public RPC endpoints.
revoke execute on function public.sync_milk_to_finance() from public, anon, authenticated;
revoke execute on function public.sync_reproduction_to_animal_and_finance() from public, anon, authenticated;
