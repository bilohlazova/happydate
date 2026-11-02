import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, cp, rm } from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {checkStagingReconciliation} from '../scripts/check-staging-reconciliation.mjs';
const root=new URL('../',import.meta.url);
test('already-applied Staging operations have exact reviewed ledger mapping outside automatic replay',async()=>{
 const m=await checkStagingReconciliation(root);
 assert.deepEqual(m.operations.map(x=>[x.remote_version,x.remote_name]),[
 ['20261102190934','20261102183848_reconcile_survey_event_preservation'],
 ['20261102191356','20261102183850_provision_release_media_buckets'],
 ]);
});
test('release contract refuses accidental automatic replay and unreviewed source changes',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'happydate-routing-'));
 try{
  await mkdir(join(dir,'supabase/migrations'),{recursive:true});
  await cp(new URL('../supabase/staging-reconciliations',import.meta.url),join(dir,'supabase/staging-reconciliations'),{recursive:true});
  const manifest=await checkStagingReconciliation(dir);const op=manifest.operations[0];
  const automatic=join(dir,'supabase/migrations',op.source_file.split('/').at(-1));
  await cp(join(dir,op.source_file),automatic);
  await assert.rejects(checkStagingReconciliation(dir),/automatic migration replay/);
  await rm(automatic);
  const renamed=join(dir,'supabase/migrations/20990101000000_unrelated_name.sql');
  await cp(join(dir,op.source_file),renamed);
  await assert.rejects(checkStagingReconciliation(dir),/automatic migration replay/);
  await rm(renamed);
  await writeFile(join(dir,op.source_file),'-- unreviewed SQL');
  await assert.rejects(checkStagingReconciliation(dir),/source changed/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
