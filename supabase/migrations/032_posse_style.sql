-- Posse name colour and font (cosmetic unlocks chosen by the Posse owner; validated against Posse level in api/posse.ts).
alter table public.posses add column if not exists name_color text;
alter table public.posses add column if not exists name_font text;
notify pgrst, 'reload schema';
-- CHECK (should return 2): select count(*) from information_schema.columns where table_schema='public' and table_name='posses' and column_name in ('name_color','name_font');
