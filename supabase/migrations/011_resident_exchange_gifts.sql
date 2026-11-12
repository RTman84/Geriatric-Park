-- Resident Exchange v2: the owner picks what the HOST receives when the Elder comes home.
-- materials = Building Materials, quest = progress on one of the host's active Quests,
-- boost = temporary output boost on one of the host's buildings (host picks the target when claiming).
alter table public.resident_exchange
  add column if not exists gift_type text not null default 'materials';
alter table public.resident_exchange drop constraint if exists resident_exchange_gift_type_check;
alter table public.resident_exchange
  add constraint resident_exchange_gift_type_check check (gift_type in ('materials', 'quest', 'boost'));
