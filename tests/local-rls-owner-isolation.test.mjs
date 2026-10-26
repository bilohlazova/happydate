import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import test from "node:test";

const enabled = process.env.RUN_LOCAL_SUPABASE_RLS_TESTS === "1";
const databaseContainer = "supabase_db_toto";

function createIds() {
  return {
    userA: randomUUID(), userB: randomUUID(),
    personA: randomUUID(), personB: randomUUID(),
    eventA: randomUUID(), eventB: randomUUID(),
    memoryA: randomUUID(), memoryB: randomUUID(),
    personForeignInsert: randomUUID(),
    eventForeignInsert: randomUUID(),
    memoryForeignInsert: randomUUID(),
  };
}

function setup(ids) {
  return `
begin;
insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('${ids.userA}', 'authenticated', 'authenticated', 'rls-owner-a-${ids.userA}@example.test', 'not-a-password', now(), '{}', '{}', now(), now()),
  ('${ids.userB}', 'authenticated', 'authenticated', 'rls-owner-b-${ids.userB}@example.test', 'not-a-password', now(), '{}', '{}', now(), now());

-- Seed B under the privileged session, then run all requested mutations as A.
insert into public.people (id, user_id, name)
values ('${ids.personB}', '${ids.userB}', 'Synthetic owner B person');
insert into public.events (id, user_id, title, date, person_id)
values ('${ids.eventB}', '${ids.userB}', 'Synthetic owner B event', date '2030-01-02', '${ids.personB}');
insert into public.memories (id, user_id, person_id, event_id, content_text)
values ('${ids.memoryB}', '${ids.userB}', '${ids.personB}', '${ids.eventB}', 'Synthetic owner B memory');

set local role authenticated;
select set_config('request.jwt.claim.sub', '${ids.userA}', true);
`;
}

function runSql(label, buildAssertions) {
  const ids = createIds();
  const sql = `${setup(ids)}\n${buildAssertions(ids)}\nrollback;`;
  const result = spawnSync("docker", [
    "exec", "-i", databaseContainer, "psql", "-X", "-v", "ON_ERROR_STOP=1",
    "-U", "postgres", "-d", "postgres", "-P", "pager=off", "-c", sql,
  ], { encoding: "utf8", input: "" });

  // On any psql error the connection closes; PostgreSQL then rolls back this
  // open transaction. Successful runs reach the explicit ROLLBACK above.
  assert.equal(result.status, 0, `${label} failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  return `${result.stdout}\n${result.stderr}`;
}

function expectBlocked(operation, sql) {
  return `
do $assert$
declare succeeded boolean := false;
begin
  begin
    ${sql}
    succeeded := true;
  exception when others then
    if sqlstate <> '42501' then raise; end if;
    raise notice 'PASS blocked: ${operation} SQLSTATE=%', sqlstate;
  end;
  if succeeded then raise exception 'blocked operation unexpectedly succeeded: ${operation}'; end if;
end
$assert$;
`;
}

function assertDmlRowCount(label, sql, expected) {
  return `
do $assert$
declare affected bigint;
begin
  ${sql}
  get diagnostics affected = row_count;
  if affected <> ${expected} then
    raise exception '${label}: expected ROW_COUNT ${expected}, got %', affected;
  end if;
  raise notice 'PASS ${label}: ROW_COUNT=%', affected;
end
$assert$;
`;
}

function assertVisibleRowCount(label, query, expected) {
  return `
do $assert$
declare actual bigint;
begin
  select count(*) into actual from (${query}) observed;
  if actual <> ${expected} then
    raise exception '${label}: expected ${expected} row(s), got %', actual;
  end if;
  raise notice 'PASS ${label}: % row(s)', actual;
end
$assert$;
`;
}

function assertPrivilegedFixtureState(ids) {
  return `
reset role;
do $assert$
begin
  if not exists (
    select 1 from public.people
    where id = '${ids.personB}' and user_id = '${ids.userB}'
      and name = 'Synthetic owner B person'
  ) then raise exception 'owner B people fixture was deleted or changed'; end if;
  if not exists (
    select 1 from public.events
    where id = '${ids.eventB}' and user_id = '${ids.userB}'
      and title = 'Synthetic owner B event' and date = date '2030-01-02'
      and person_id = '${ids.personB}'
  ) then raise exception 'owner B events fixture was deleted or changed'; end if;
  if not exists (
    select 1 from public.memories
    where id = '${ids.memoryB}' and user_id = '${ids.userB}'
      and person_id = '${ids.personB}' and event_id = '${ids.eventB}'
      and content_text = 'Synthetic owner B memory'
  ) then raise exception 'owner B memories fixture was deleted or changed'; end if;
  if exists (select 1 from public.people where id = '${ids.personA}')
     or exists (select 1 from public.events where id = '${ids.eventA}')
     or exists (select 1 from public.memories where id = '${ids.memoryA}') then
    raise exception 'an owner A row remained after its exact DELETE assertion';
  end if;
  raise notice 'PASS privileged post-check: B rows unchanged; A rows deleted';
end
$assert$;
set local role authenticated;
select set_config('request.jwt.claim.sub', '${ids.userA}', true);
`;
}

test("local RLS regression: policy contents and SQL grants are safe", { skip: !enabled }, () => {
  const output = runSql("RLS/GRANT contract", () => `
    do $assert$
    declare
      table_name text; operation text; expected_command text; policy record; table_ref text;
    begin
      foreach table_name in array array['people', 'events', 'memories'] loop
        table_ref := format('public.%I', table_name);
        foreach operation in array array['select', 'insert', 'update', 'delete'] loop
          if not has_table_privilege('authenticated', table_ref, operation) then
            raise exception 'authenticated % table GRANT missing for %', operation, table_name;
          end if;
          if has_table_privilege('anon', table_ref, operation)
             or (operation <> 'delete' and has_any_column_privilege('anon', table_ref, operation)) then
            raise exception 'anon % GRANT unexpectedly present for %', operation, table_name;
          end if;
        end loop;
        if not (select relrowsecurity from pg_class where oid = table_ref::regclass) then
          raise exception 'RLS is disabled for %', table_name;
        end if;
        if (select count(*) from pg_policies where schemaname = 'public' and tablename = table_name) <> 4 then
          raise exception 'expected exactly four policies for %, including no additional permissive policies', table_name;
        end if;
        foreach expected_command in array array['SELECT', 'INSERT', 'UPDATE', 'DELETE'] loop
          select * into policy from pg_policies
          where schemaname = 'public' and tablename = table_name
            and policyname = table_name || '_' || lower(expected_command) || '_own';
          if not found then raise exception 'missing % policy for %', expected_command, table_name; end if;
          if policy.cmd <> expected_command or policy.roles <> array['authenticated']::name[] then
            raise exception 'policy % for % has unsafe command or role scope', policy.policyname, table_name;
          end if;
          if expected_command in ('SELECT', 'UPDATE', 'DELETE')
             and (policy.qual is null or regexp_replace(policy.qual, '\\s+', '', 'g') !~ 'auth\\.uid\\(\\).*user_id') then
            raise exception 'policy % lacks owner-only USING expression', policy.policyname;
          end if;
          if expected_command in ('INSERT', 'UPDATE') then
            if policy.with_check is null
               or regexp_replace(policy.with_check, '\\s+', '', 'g') !~ 'auth\\.uid\\(\\).*user_id' then
              raise exception 'policy % lacks owner-only WITH CHECK expression', policy.policyname;
            end if;
          elsif policy.with_check is not null then
            raise exception 'policy % unexpectedly has WITH CHECK', policy.policyname;
          end if;
          if expected_command = 'INSERT' and policy.qual is not null then
            raise exception 'INSERT policy % unexpectedly has USING', policy.policyname;
          end if;
        end loop;
        if table_name in ('events', 'memories') and not exists (
          select 1 from pg_policies
          where schemaname = 'public' and tablename = table_name
            and policyname = table_name || '_insert_own'
            and with_check ~* 'person_id' and with_check ~* 'from[[:space:]]+people'
        ) then raise exception '% INSERT policy lacks same-owner person check', table_name; end if;
        if table_name in ('events', 'memories') and not exists (
          select 1 from pg_policies
          where schemaname = 'public' and tablename = table_name
            and policyname = table_name || '_update_own'
            and with_check ~* 'person_id' and with_check ~* 'from[[:space:]]+people'
        ) then raise exception '% UPDATE policy lacks same-owner person check', table_name; end if;
        if table_name = 'memories' and (
          select count(*) from pg_policies
          where schemaname = 'public' and tablename = 'memories'
            and policyname in ('memories_insert_own', 'memories_update_own')
            and with_check ~* 'event_id' and with_check ~* 'from[[:space:]]+events'
        ) <> 2 then raise exception 'memories policies lack same-owner event checks'; end if;
        raise notice 'PASS policy/GRANT contract: % (commands, roles, USING, WITH CHECK, no extras)', table_name;
      end loop;
    end
    $assert$;
  `);
  assert.match(output, /PASS policy\/GRANT contract: people/);
  assert.match(output, /PASS policy\/GRANT contract: events/);
  assert.match(output, /PASS policy\/GRANT contract: memories/);
});

test("local RLS regression: owner CRUD is exact and foreign UPDATE/DELETE are no-ops", { skip: !enabled }, () => {
  const output = runSql("owner CRUD isolation", (ids) => `
    ${assertDmlRowCount("own people INSERT", `insert into public.people (id, user_id, name) values ('${ids.personA}', '${ids.userA}', 'Synthetic owner A person');`, 1)}
    ${assertVisibleRowCount("own people INSERT state", `select 1 from public.people where id = '${ids.personA}' and user_id = '${ids.userA}' and name = 'Synthetic owner A person'`, 1)}
    ${assertVisibleRowCount("foreign people SELECT", `select 1 from public.people where id = '${ids.personB}'`, 0)}
    ${assertDmlRowCount("own people UPDATE", `update public.people set name = 'Synthetic owner A person updated' where id = '${ids.personA}';`, 1)}
    ${assertVisibleRowCount("own people UPDATE state", `select 1 from public.people where id = '${ids.personA}' and name = 'Synthetic owner A person updated'`, 1)}
    ${assertDmlRowCount("foreign people UPDATE", `update public.people set name = 'must remain unchanged' where id = '${ids.personB}';`, 0)}
    ${assertDmlRowCount("foreign people DELETE", `delete from public.people where id = '${ids.personB}';`, 0)}

    ${assertDmlRowCount("own events INSERT", `insert into public.events (id, user_id, title, date, person_id) values ('${ids.eventA}', '${ids.userA}', 'Synthetic owner A event', date '2030-01-01', '${ids.personA}');`, 1)}
    ${assertVisibleRowCount("own events INSERT state", `select 1 from public.events where id = '${ids.eventA}' and user_id = '${ids.userA}' and title = 'Synthetic owner A event' and person_id = '${ids.personA}'`, 1)}
    ${assertVisibleRowCount("foreign events SELECT", `select 1 from public.events where id = '${ids.eventB}'`, 0)}
    ${assertDmlRowCount("own events UPDATE", `update public.events set title = 'Synthetic owner A event updated' where id = '${ids.eventA}';`, 1)}
    ${assertVisibleRowCount("own events UPDATE state", `select 1 from public.events where id = '${ids.eventA}' and title = 'Synthetic owner A event updated'`, 1)}
    ${assertDmlRowCount("foreign events UPDATE", `update public.events set title = 'must remain unchanged' where id = '${ids.eventB}';`, 0)}
    ${assertDmlRowCount("foreign events DELETE", `delete from public.events where id = '${ids.eventB}';`, 0)}

    ${assertDmlRowCount("own memories INSERT", `insert into public.memories (id, user_id, person_id, event_id, content_text) values ('${ids.memoryA}', '${ids.userA}', '${ids.personA}', '${ids.eventA}', 'Synthetic owner A memory');`, 1)}
    ${assertVisibleRowCount("own memories INSERT state", `select 1 from public.memories where id = '${ids.memoryA}' and user_id = '${ids.userA}' and person_id = '${ids.personA}' and event_id = '${ids.eventA}' and content_text = 'Synthetic owner A memory'`, 1)}
    ${assertVisibleRowCount("foreign memories SELECT", `select 1 from public.memories where id = '${ids.memoryB}'`, 0)}
    ${assertDmlRowCount("own memories UPDATE", `update public.memories set content_text = 'Synthetic owner A memory updated' where id = '${ids.memoryA}';`, 1)}
    ${assertVisibleRowCount("own memories UPDATE state", `select 1 from public.memories where id = '${ids.memoryA}' and content_text = 'Synthetic owner A memory updated'`, 1)}
    ${assertDmlRowCount("foreign memories UPDATE", `update public.memories set content_text = 'must remain unchanged' where id = '${ids.memoryB}';`, 0)}
    ${assertDmlRowCount("foreign memories DELETE", `delete from public.memories where id = '${ids.memoryB}';`, 0)}

    ${assertDmlRowCount("own memories DELETE", `delete from public.memories where id = '${ids.memoryA}';`, 1)}
    ${assertDmlRowCount("own events DELETE", `delete from public.events where id = '${ids.eventA}';`, 1)}
    ${assertDmlRowCount("own people DELETE", `delete from public.people where id = '${ids.personA}';`, 1)}
    ${assertPrivilegedFixtureState(ids)}
  `);
  for (const label of [
    "foreign people UPDATE", "foreign people DELETE",
    "foreign events UPDATE", "foreign events DELETE",
    "foreign memories UPDATE", "foreign memories DELETE",
  ]) assert.match(output, new RegExp(`PASS ${label}: ROW_COUNT=0`));
  assert.match(output, /PASS privileged post-check: B rows unchanged; A rows deleted/);
});

test("local RLS regression: ownership and cross-reference checks reject foreign identities", { skip: !enabled }, () => {
  const output = runSql("ownership and cross-reference checks", (ids) => `
    ${assertDmlRowCount("own people fixture INSERT", `insert into public.people (id, user_id, name) values ('${ids.personA}', '${ids.userA}', 'Synthetic owner A person');`, 1)}
    ${assertDmlRowCount("own events fixture INSERT", `insert into public.events (id, user_id, title, date, person_id) values ('${ids.eventA}', '${ids.userA}', 'Synthetic owner A event', date '2030-01-01', '${ids.personA}');`, 1)}
    ${assertDmlRowCount("own memories fixture INSERT", `insert into public.memories (id, user_id, person_id, event_id, content_text) values ('${ids.memoryA}', '${ids.userA}', '${ids.personA}', '${ids.eventA}', 'Synthetic owner A memory');`, 1)}

    ${expectBlocked("people.user_id reassignment", `update public.people set user_id = '${ids.userB}' where id = '${ids.personA}';`)}
    ${expectBlocked("events.user_id reassignment", `update public.events set user_id = '${ids.userB}' where id = '${ids.eventA}';`)}
    ${expectBlocked("memories.user_id reassignment", `update public.memories set user_id = '${ids.userB}' where id = '${ids.memoryA}';`)}
    ${expectBlocked("people INSERT for foreign user", `insert into public.people (id, user_id, name) values ('${ids.personForeignInsert}', '${ids.userB}', 'invalid foreign owner insert');`)}
    ${expectBlocked("events INSERT for foreign user", `insert into public.events (id, user_id, title, date) values ('${ids.eventForeignInsert}', '${ids.userB}', 'invalid foreign owner insert', date '2030-01-04');`)}
    ${expectBlocked("memories INSERT for foreign user", `insert into public.memories (id, user_id, content_text) values ('${ids.memoryForeignInsert}', '${ids.userB}', 'invalid foreign owner insert');`)}
    ${expectBlocked("event INSERT with foreign person_id", `insert into public.events (id, user_id, title, date, person_id) values ('${ids.eventForeignInsert}', '${ids.userA}', 'invalid foreign person link', date '2030-01-03', '${ids.personB}');`)}
    ${expectBlocked("memory INSERT with foreign person_id", `insert into public.memories (id, user_id, person_id, content_text) values ('${ids.memoryForeignInsert}', '${ids.userA}', '${ids.personB}', 'invalid foreign person link');`)}
    ${expectBlocked("memory INSERT with foreign event_id", `insert into public.memories (id, user_id, event_id, content_text) values ('${ids.memoryForeignInsert}', '${ids.userA}', '${ids.eventB}', 'invalid foreign event link');`)}
    ${expectBlocked("event UPDATE with foreign person_id", `update public.events set person_id = '${ids.personB}' where id = '${ids.eventA}';`)}
    ${expectBlocked("memory UPDATE with foreign person_id", `update public.memories set person_id = '${ids.personB}' where id = '${ids.memoryA}';`)}
    ${expectBlocked("memory UPDATE with foreign event_id", `update public.memories set event_id = '${ids.eventB}' where id = '${ids.memoryA}';`)}
  `);
  assert.match(output, /PASS blocked: people\.user_id reassignment SQLSTATE=42501/);
  assert.match(output, /PASS blocked: memories\.user_id reassignment SQLSTATE=42501/);
  assert.match(output, /PASS blocked: event INSERT with foreign person_id SQLSTATE=42501/);
  assert.match(output, /PASS blocked: memory UPDATE with foreign event_id SQLSTATE=42501/);
});
