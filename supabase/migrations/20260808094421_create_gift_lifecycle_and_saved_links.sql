-- Canonical Gift lifecycle and user-saved external references.
-- Gift links are untrusted user data, not verified merchant partnerships.

create table public.gifts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  title text not null,
  lifecycle text not null default 'idea',
  occurred_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gifts_title_check
    check (char_length(btrim(title)) between 1 and 280),
  constraint gifts_lifecycle_check
    check (lifecycle in ('idea', 'selected', 'purchased', 'given')),
  constraint gifts_given_date_check
    check (lifecycle <> 'given' or occurred_on is not null),
  constraint gifts_identity_owner_person_unique
    unique (id, user_id, person_id)
);

create index gifts_user_person_lifecycle_date_idx
  on public.gifts (user_id, person_id, lifecycle, occurred_on desc nulls last);
create index gifts_event_id_idx on public.gifts (event_id) where event_id is not null;

create trigger gifts_set_updated_at
before update on public.gifts
for each row execute function public.set_updated_at();

create table public.gift_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  gift_id uuid,
  url text not null,
  title text,
  merchant text,
  image_url text,
  price_amount numeric(12, 2),
  currency text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gift_links_gift_owner_person_fk
    foreign key (gift_id, user_id, person_id)
    references public.gifts (id, user_id, person_id)
    on delete cascade,
  constraint gift_links_url_check
    check (char_length(url) <= 2048 and lower(url) ~ '^https://[^[:space:]]+$'),
  constraint gift_links_title_check
    check (title is null or char_length(btrim(title)) between 1 and 280),
  constraint gift_links_merchant_check
    check (merchant is null or char_length(btrim(merchant)) between 1 and 160),
  constraint gift_links_image_url_check
    check (
      image_url is null
      or (char_length(image_url) <= 2048 and lower(image_url) ~ '^https://[^[:space:]]+$')
    ),
  constraint gift_links_price_check
    check (price_amount is null or price_amount >= 0),
  constraint gift_links_currency_check
    check (currency is null or currency ~ '^[A-Z]{3}$')
);

create index gift_links_user_person_created_idx
  on public.gift_links (user_id, person_id, created_at desc);
create index gift_links_gift_id_idx on public.gift_links (gift_id) where gift_id is not null;
create index gift_links_event_id_idx on public.gift_links (event_id) where event_id is not null;

create trigger gift_links_set_updated_at
before update on public.gift_links
for each row execute function public.set_updated_at();

alter table public.gifts enable row level security;
alter table public.gift_links enable row level security;

revoke all on table public.gifts from public, anon, authenticated;
revoke all on table public.gift_links from public, anon, authenticated;
grant select, insert, update, delete on table public.gifts to authenticated;
grant select, insert, update, delete on table public.gift_links to authenticated;

create policy "gifts_select_own"
on public.gifts for select to authenticated
using ((select auth.uid()) = user_id);

create policy "gifts_insert_own_relations"
on public.gifts for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.people person
    where person.id = person_id and person.user_id = (select auth.uid())
  )
  and (
    event_id is null
    or exists (
      select 1 from public.events event
      where event.id = event_id and event.user_id = (select auth.uid())
    )
  )
);

create policy "gifts_update_own_relations"
on public.gifts for update to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.people person
    where person.id = person_id and person.user_id = (select auth.uid())
  )
  and (
    event_id is null
    or exists (
      select 1 from public.events event
      where event.id = event_id and event.user_id = (select auth.uid())
    )
  )
);

create policy "gifts_delete_own"
on public.gifts for delete to authenticated
using ((select auth.uid()) = user_id);

create policy "gift_links_select_own"
on public.gift_links for select to authenticated
using ((select auth.uid()) = user_id);

create policy "gift_links_insert_own_relations"
on public.gift_links for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.people person
    where person.id = person_id and person.user_id = (select auth.uid())
  )
  and (
    event_id is null
    or exists (
      select 1 from public.events event
      where event.id = event_id and event.user_id = (select auth.uid())
    )
  )
);

create policy "gift_links_update_own_relations"
on public.gift_links for update to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.people person
    where person.id = person_id and person.user_id = (select auth.uid())
  )
  and (
    event_id is null
    or exists (
      select 1 from public.events event
      where event.id = event_id and event.user_id = (select auth.uid())
    )
  )
);

create policy "gift_links_delete_own"
on public.gift_links for delete to authenticated
using ((select auth.uid()) = user_id);

comment on table public.gifts is
  'Canonical user-owned gift lifecycle; given rows form confirmed gift history.';
comment on table public.gift_links is
  'User-saved external HTTPS gift references; metadata is untrusted and may become stale.';
