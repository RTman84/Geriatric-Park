-- Squad Loan: a placement can be a 'loan' (the host borrows the Elder for Battle/Court) instead of a 'visit'.
-- snapshot holds the Elder's combat stats at the moment it was lent (client-supplied, validated by the API).
alter table public.resident_exchange
  add column if not exists mode text not null default 'visit';
alter table public.resident_exchange drop constraint if exists resident_exchange_mode_check;
alter table public.resident_exchange
  add constraint resident_exchange_mode_check check (mode in ('visit', 'loan'));
alter table public.resident_exchange
  add column if not exists snapshot jsonb;
notify pgrst, 'reload schema';
