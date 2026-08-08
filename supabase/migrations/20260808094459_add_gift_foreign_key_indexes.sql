-- Cover foreign-key column order used by deletes and constraint checks.
create index gifts_person_id_idx on public.gifts (person_id);
create index gift_links_person_id_idx on public.gift_links (person_id);
create index gift_links_gift_owner_person_idx
  on public.gift_links (gift_id, user_id, person_id)
  where gift_id is not null;
