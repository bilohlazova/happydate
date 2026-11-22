// Offline release contract only: no database credentials, network or writes.
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
export async function checkStagingReconciliation(root=new URL('../',import.meta.url)) {
  const base=root instanceof URL?fileURLToPath(root):root;
  const manifest=JSON.parse(await readFile(resolve(base,'supabase/staging-reconciliations/applied.json'),'utf8'));
  if(manifest.project_id!=='xgelazzdgluuenqkymox'||manifest.scope!=='staging-only'||manifest.automatic_replay!==false||manifest.operations.length!==2)throw new Error('Invalid staging-only reconciliation manifest');
  const automaticFiles=await readdir(resolve(base,'supabase/migrations'));
  const automaticHashes=await Promise.all(automaticFiles.filter(name=>name.endsWith('.sql')).map(async name=>createHash('sha256').update(await readFile(resolve(base,'supabase/migrations',name))).digest('hex')));
  for(const op of manifest.operations){
    if(!/^supabase\/staging-reconciliations\/202611021838(?:48|50)_[a-z_]+\.sql$/.test(op.source_file))throw new Error('Invalid reconciliation path');
    const bytes=await readFile(resolve(base,op.source_file));
    if(createHash('sha256').update(bytes).digest('hex')!==op.source_sha256)throw new Error('Reconciliation source changed; independent review required');
    if(!op.exact_approved_query_match||op.applied_query_sha256!==op.approved_query_sha256)throw new Error('Applied payload differs from approved payload');
    if(automaticHashes.includes(op.source_sha256)||automaticFiles.some(name=>name===op.source_file.split('/').at(-1)||name.startsWith(op.remote_version+'_')||name.includes(op.remote_name.replace(/^\d+_/,''))))throw new Error('Staging-only operation entered automatic migration replay');
  }
  if(manifest.operations.map(op=>op.remote_version).join(',')!=='20261102190934,20261102191356')throw new Error('Unexpected reviewed remote migration versions');
  return manifest;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  await checkStagingReconciliation();
  console.log('PASS: two applied Staging reconciliations match approved hashes/remote ledger mapping and are excluded from automatic migration replay. No database changed.');
}
