// Reconstructs already-applied review payloads only; see applied.json. No connection, network,
// migration execution, credentials, or historical ledger repair.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
const output=resolve(process.argv[2]??'/tmp/happydate-staging-release');
const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
const [preflight,snapshot,verify]=await Promise.all(['preflight','preservation-snapshot','preservation-assert'].map(part=>read(`scripts/sql/staging-release-${part}.sql`)));
await mkdir(output,{recursive:true});
for(const name of ['20261102183848_reconcile_survey_event_preservation','20261102183850_provision_release_media_buckets']){
  const source=await read(`supabase/staging-reconciliations/${name}.sql`);
  const query=`${preflight}\n${snapshot}\n${source}\n${verify}`;
  const payload={project_id:'xgelazzdgluuenqkymox',name,query};
  await writeFile(resolve(output,`${name}.json`),JSON.stringify(payload,null,2)+'\n');
  console.log(`${name}: source SHA256 ${createHash('sha256').update(source).digest('hex')}; query SHA256 ${createHash('sha256').update(query).digest('hex')}`);
}
console.log(`Reconstructed two already-applied Staging payloads in ${output}; DO NOT REAPPLY. See supabase/staging-reconciliations/applied.json for remote versions. No database changed.`);
