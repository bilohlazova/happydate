// LOCAL ONLY. This does not accept a remote connection string or run the CLI's
// linked project operations. Apply local DDL only after rollback tests pass.
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
if (process.env.ALLOW_LOCAL_RELEASE_REPAIR !== '1') throw new Error('Explicit ALLOW_LOCAL_RELEASE_REPAIR=1 required');
if (process.env.DOCKER_HOST && !process.env.DOCKER_HOST.startsWith('unix://')) throw new Error('Only local Docker is allowed');
const container=process.env.LOCAL_SUPABASE_DB_CONTAINER ?? 'supabase_db_toto';
if (!/^supabase_db_[a-z0-9_-]+$/.test(container)) throw new Error('Expected local Supabase database container');
const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
const [rpc,storage,snapshot,verify,preflight]=await Promise.all([
  read('supabase/migrations/20261102183848_reconcile_survey_event_preservation.sql'),
  read('supabase/migrations/20261102183850_provision_release_media_buckets.sql'),
  read('scripts/sql/staging-release-preservation-snapshot.sql'),
  read('scripts/sql/staging-release-preservation-assert.sql'),
  read('scripts/sql/staging-release-preflight.sql'),
]);
const result=spawnSync('docker',['exec','-i',container,'psql','-X','-v','ON_ERROR_STOP=1','-U','postgres','-d','postgres','-q'],{
  input:`begin; set local lock_timeout='5s'; set local statement_timeout='60s'; ${preflight}\n${snapshot}\n${rpc}\n${storage}\n${rpc}\n${storage}\n${verify}\ncommit;`,encoding:'utf8',
});
if(result.status!==0) throw new Error('Local rehearsal failed; transaction rolled back. Inspect local schema/lock availability.');
console.log('PASS local repair applied twice: events, memories, gifts, tasks, survey, profiles and object rows unchanged; local media buckets configured');
