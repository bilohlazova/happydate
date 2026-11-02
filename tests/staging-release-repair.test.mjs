import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const rpcUrl = new URL('../supabase/migrations/20261102183848_reconcile_survey_event_preservation.sql', import.meta.url);
const storageUrl = new URL('../supabase/migrations/20261102183850_provision_release_media_buckets.sql', import.meta.url);
const [rpc, storage, oldRpc, canonical, preflight, snapshot, preserveVerify] = await Promise.all([
  readFile(rpcUrl, 'utf8'), readFile(storageUrl, 'utf8'),
  readFile(new URL('./fixtures/staging-survey-before-release-repair.sql', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/migrations/20261020153546_preserve_legacy_survey_events.sql', import.meta.url), 'utf8'),
  readFile(new URL('../scripts/sql/staging-release-preflight.sql', import.meta.url), 'utf8'),
  readFile(new URL('../scripts/sql/staging-release-preservation-snapshot.sql', import.meta.url), 'utf8'),
  readFile(new URL('../scripts/sql/staging-release-preservation-assert.sql', import.meta.url), 'utf8'),
]);
const enabled = process.env.RUN_LOCAL_SUPABASE_RLS_TESTS === '1';
const container = process.env.LOCAL_SUPABASE_DB_CONTAINER ?? 'supabase_db_toto';
function sql(query) {
  const r = spawnSync('docker', ['exec', '-i', container, 'psql', '-X', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres', '-q'], { input: query, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr); return r.stdout;
}

test('forward RPC reconciliation is exactly the reviewed canonical migration', () => {
  assert.equal(rpc.split('\n').slice(2).join('\n'), canonical);
});

test('Staging snapshot reproduces event loss; repeated repair preserves event graph and rewards', {skip:!enabled}, () => {
  const a=randomUUID(), b=randomUUID(), legacy=randomUUID(), foreign=randomUUID(), memory=randomUUID(), gift=randomUUID(), task=randomUUID();
  const fixture=`
    -- Match live Staging: provenance column does not exist yet. Transaction rolls back.
    alter table public.events drop column if exists survey_origin;
    insert into auth.users (id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
    values ('${a}','authenticated','authenticated','${a}@example.test','not-a-password',now(),'{}','{}',now(),now()),
           ('${b}','authenticated','authenticated','${b}@example.test','not-a-password',now(),'{}','{}',now(),now());
    insert into public.events (id,user_id,title,date) values ('${legacy}','${a}','Keep legacy','2030-02-01'),('${foreign}','${b}','Keep foreign','2030-02-02');
    insert into public.memories (id,user_id,event_id,content_text) values ('${memory}','${a}','${legacy}','Keep memory link');
    insert into public.people (id,user_id,name) values ('${a}','${a}','Synthetic person');
    insert into public.gifts (id,user_id,person_id,event_id,title) values ('${gift}','${a}','${a}','${legacy}','Keep gift link');
    insert into public.happy_tasks (id,user_id,event_id,title,type) values ('${task}','${a}','${legacy}','Keep task','birthday');
    insert into public.user_survey (user_id,likes,dislikes,dream,notes,is_completed,completed_at,reward_granted_at,special_date_event_ids)
    values ('${a}','{}','{}','','',true,now(),now(),array['${legacy}'::uuid]);
    select set_config('request.jwt.claim.sub','${a}',true);
    create temp table expected_events as select * from public.events where id in ('${legacy}','${foreign}');
    create temp table expected_points as select points from public.profiles where id='${a}';
  `;
  // Original Staging function: [] drops the legacy event and cascades/nulls links.
  const before=sql(`begin; ${oldRpc} ${fixture}
    set local role authenticated;
    select * from public.save_my_onboarding_survey('{}','{}','','','[]');
    reset role;
    do $$ begin if exists(select 1 from public.events where id='${legacy}') then raise exception 'fixture did not reproduce original event loss'; end if; end $$;
    select 'REPRODUCED original Staging legacy event deletion'; rollback;`);
  assert.match(before,/REPRODUCED/);
  const after=sql(`begin; ${oldRpc} ${fixture}
    ${preflight} ${snapshot} ${rpc} ${rpc} ${preserveVerify}
    -- Applying DDL twice must not mutate any existing event rows.
    do $$ begin if exists(select 1 from expected_events e left join public.events actual using(id) where actual.id is null or to_jsonb(e)<>(to_jsonb(actual)-'survey_origin')) then raise exception 'repair changed existing events'; end if; end $$;
    set local role authenticated;
    select * from public.save_my_onboarding_survey('{}','{}','updated','',null);
    select * from public.save_my_onboarding_survey('{}','{}','updated','','[]');
    select * from public.save_my_onboarding_survey('{}','{}','','','[{"kind":"celebration","label":"New marked","date":"2031-02-01"}]');
    create temp table generated_event as select special_date_event_ids[1] as id from public.user_survey where user_id='${a}';
    select * from public.save_my_onboarding_survey('{}','{}','','','[{"kind":"support","label":"Updated marked","date":"2031-03-01"}]');
    do $$ begin if (select special_date_event_ids[1] from public.user_survey where user_id='${a}') <> (select id from generated_event) then raise exception 'marked ID changed'; end if; end $$;
    select * from public.save_my_onboarding_survey('{}','{}','','','[]');
    reset role;
    do $$ begin
      if exists(select 1 from expected_events e left join public.events actual using(id) where actual.id is null or to_jsonb(e)<>(to_jsonb(actual)-'survey_origin')) then raise exception 'legacy or foreign event changed'; end if;
      if not exists(select 1 from public.memories where id='${memory}' and event_id='${legacy}') then raise exception 'memory link lost'; end if;
      if not exists(select 1 from public.gifts where id='${gift}' and event_id='${legacy}') then raise exception 'gift link lost'; end if;
      if not exists(select 1 from public.happy_tasks where id='${task}' and event_id='${legacy}') then raise exception 'task lost'; end if;
      if (select points from public.profiles where id='${a}') is distinct from (select points from expected_points) then raise exception 'reward repeated'; end if;
      if not exists(select 1 from public.events where id=(select id from generated_event) and title='Updated marked') then raise exception 'shorter list deleted marked event'; end if;
      if has_function_privilege('anon','public.save_my_onboarding_survey(text[],text[],text,text,jsonb)','EXECUTE') then raise exception 'anon gained execute'; end if;
    end $$;
    select 'PASS repeated repair, NULL/empty/nonempty/shortened lists, legacy/foreign events, memory/gift/task links, stable marked IDs, reward and grants'; rollback;`);
  assert.match(after,/PASS repeated repair/);
});

test('media provisioning repeats safely without deleting objects or changing unrelated buckets', {skip:!enabled}, () => {
  const output=sql(`begin;
    insert into storage.buckets(id,name,public) values ('memory-images','memory-images',false) on conflict (id) do nothing;
    insert into storage.objects(bucket_id,name) values ('memory-images','rehearsal-sentinel-${randomUUID()}.png');
    create temp table before_buckets as select * from storage.buckets;
    create temp table before_objects as select * from storage.objects;
    ${snapshot} ${storage} ${storage} ${preserveVerify}
    do $$ begin
      if (select count(*) from storage.buckets where id='avatars' and public and file_size_limit=5242880 and allowed_mime_types=array['image/jpeg','image/png','image/webp','image/heic','image/heif'])<>1 then raise exception 'avatar config wrong'; end if;
      if (select count(*) from storage.buckets where id='memory-images' and not public and file_size_limit=10485760 and allowed_mime_types=array['image/jpeg','image/png','image/webp','image/heic','image/heif'])<>1 then raise exception 'memory config wrong'; end if;
      if exists(select * from before_objects except select * from storage.objects) then raise exception 'objects changed'; end if;
      if exists(select * from before_buckets where id not in ('avatars','memory-images') except select * from storage.buckets) then raise exception 'unrelated bucket changed'; end if;
      if (select count(*) from pg_policies where schemaname='storage' and tablename='objects' and policyname ~ '^(avatars|memory_images)_(select|insert|update|delete)_own$' and roles=array['authenticated']::name[])<>8 then raise exception 'expected 8 authenticated policies'; end if;
    end $$; select 'PASS repeated media configuration and preservation'; rollback;`);
  assert.match(output,/PASS repeated media/);
});

test('approval preflight refuses unknown RPC, unsafe grants and unexpected Storage policies', {skip:!enabled}, () => {
  for (const setup of [
    oldRpc.replace('Authentication required','Unreviewed drift canary'),
    `${rpc} grant execute on function public.save_my_onboarding_survey(text[],text[],text,text,jsonb) to anon;`,
    `${rpc} create policy rehearsal_unreviewed on storage.objects for select using (true);`,
  ]) {
    const r=spawnSync('docker',['exec','-i',container,'psql','-X','-v','ON_ERROR_STOP=1','-U','postgres','-d','postgres','-q'],{input:`begin; ${setup}\n${preflight}\nrollback;`,encoding:'utf8'});
    assert.notEqual(r.status,0);assert.match(r.stderr,/Unreviewed|unreviewed/);
  }
});

test('media migration refuses to expose an existing private avatar bucket', {skip:!enabled}, () => {
  const r=spawnSync('docker',['exec','-i',container,'psql','-X','-v','ON_ERROR_STOP=1','-U','postgres','-d','postgres','-q'],{
    input:`begin; insert into storage.buckets(id,name,public) values ('avatars','avatars',false) on conflict(id) do update set public=false; ${storage}\nrollback;`,encoding:'utf8',
  });
  assert.notEqual(r.status,0);assert.match(r.stderr,/refuse to make existing data public/);
});
