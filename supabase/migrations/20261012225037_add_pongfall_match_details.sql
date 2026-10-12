-- Add compact per-player result details for the Stats page. Existing owner-only
-- pf_history policies continue to protect these details across devices.
alter table public.pf_history
  add column if not exists details jsonb not null default '{}'::jsonb;
