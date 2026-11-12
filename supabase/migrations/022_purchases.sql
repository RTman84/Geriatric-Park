-- Verified store purchases (Google Play Billing). A row is written only AFTER the server has confirmed the purchase with
-- Google; purchase_token is unique, so one purchase can never be granted twice. Browser has no direct access.
create table if not exists public.purchases (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  product_id text not null,
  purchase_token text not null unique,
  order_id text,
  mementos integer not null check (mementos > 0),
  price_usd numeric(10, 2) not null,
  created_at timestamptz not null default now()
);
create index if not exists purchases_user_idx on public.purchases (user_id, created_at desc);
alter table public.purchases enable row level security;
revoke all on public.purchases from anon, authenticated;
notify pgrst, 'reload schema';
