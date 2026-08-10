create function public.resolve_memory_knowledge_conflict(
  p_person_id uuid,
  p_winner_id uuid,
  p_loser_ids uuid[]
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_expected integer;
  v_owned_active integer;
  v_archived integer;
begin
  if v_user_id is null
     or p_person_id is null
     or p_winner_id is null
     or p_loser_ids is null
     or cardinality(p_loser_ids) < 1
     or cardinality(p_loser_ids) > 10
     or p_winner_id = any(p_loser_ids)
     or exists (select 1 from unnest(p_loser_ids) as item(id) where id is null)
     or (select count(distinct id) from unnest(p_loser_ids) as item(id)) <> cardinality(p_loser_ids) then
    raise exception 'Invalid conflict resolution' using errcode = '22023';
  end if;

  v_expected := cardinality(p_loser_ids) + 1;

  select count(*) into v_owned_active
  from public.memories
  where user_id = v_user_id
    and person_id = p_person_id
    and is_active
    and id = any(array_prepend(p_winner_id, p_loser_ids));

  if v_owned_active <> v_expected then
    raise exception 'Conflict state is stale or inaccessible' using errcode = 'P0001';
  end if;

  update public.memories
  set is_active = false
  where user_id = v_user_id
    and person_id = p_person_id
    and is_active
    and id = any(p_loser_ids);

  get diagnostics v_archived = row_count;
  if v_archived <> cardinality(p_loser_ids) then
    raise exception 'Conflict resolution was not complete' using errcode = 'P0001';
  end if;

  return v_archived;
end;
$$;

revoke all on function public.resolve_memory_knowledge_conflict(uuid, uuid, uuid[])
  from public, anon, authenticated;
grant execute on function public.resolve_memory_knowledge_conflict(uuid, uuid, uuid[])
  to authenticated;

comment on function public.resolve_memory_knowledge_conflict(uuid, uuid, uuid[]) is
  'Atomically keeps one owned active Person knowledge row and archives the explicitly supplied conflicting rows.';
