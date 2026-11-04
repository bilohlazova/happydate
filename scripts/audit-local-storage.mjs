import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
const status=spawnSync('npx',['--yes','supabase@2.122.0','status','--workdir',process.env.LOCAL_SUPABASE_WORKDIR??process.cwd(),'-o','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
if(status.status!==0) throw new Error('Local Supabase status unavailable');
let config;try{config=JSON.parse(status.stdout);}catch{throw new Error('Invalid local status');}
if(!['127.0.0.1','localhost'].includes(new URL(config.API_URL).hostname))throw new Error('Localhost required');
const options={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
const admin=createClient(config.API_URL,config.SERVICE_ROLE_KEY,options);
const anon=createClient(config.API_URL,config.ANON_KEY,options);
const clients=[createClient(config.API_URL,config.ANON_KEY,options),createClient(config.API_URL,config.ANON_KEY,options)];
const users=[],objects=[];
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aKZsAAAAASUVORK5CYII=','base64');
try{
  for(const client of clients){
    const email=`storage-${randomUUID()}@example.test`,password=`Audit-${randomUUID()}-aA1!`;
    const created=await admin.auth.admin.createUser({email,password,email_confirm:true});assert.equal(created.error,null);users.push(created.data.user.id);
    assert.equal((await client.auth.signInWithPassword({email,password})).error,null);
  }
  const [a,b]=clients;
  for(const bucket of ['avatars','memory-images']){
    const path=`${users[0]}/${randomUUID()}.png`;objects.push({bucket,path});
    assert.equal((await a.storage.from(bucket).upload(path,png,{contentType:'image/png'})).error,null);
    assert.equal((await a.storage.from(bucket).download(path)).error,null);
    assert.equal((await a.storage.from(bucket).upload(path,png,{contentType:'image/png',upsert:true})).error,null);
    const foreignPath=`${users[0]}/${randomUUID()}.png`;objects.push({bucket,path:foreignPath});
    const badInsert=await b.storage.from(bucket).upload(foreignPath,png,{contentType:'image/png'});assert.ok(badInsert.error);
    assert.ok((await b.storage.from(bucket).upload(path,png,{contentType:'image/png',upsert:true})).error);
    const foreignList=await b.storage.from(bucket).list(users[0]);assert.equal(foreignList.error,null);assert.equal(foreignList.data.length,0);
    const foreignDelete=await b.storage.from(bucket).remove([path]);assert.equal(foreignDelete.error,null);assert.equal(foreignDelete.data.length,0);
    assert.equal((await a.storage.from(bucket).download(path)).error,null);
    if(bucket==='memory-images'){assert.ok((await anon.storage.from(bucket).download(path)).error);assert.ok((await b.storage.from(bucket).download(path)).error);}
    const {data:{publicUrl}}=a.storage.from(bucket).getPublicUrl(path);
    const publicResponse=await fetch(publicUrl);assert.equal(publicResponse.ok,bucket==='avatars');
    if(bucket==='memory-images'){
      assert.ok((await b.storage.from(bucket).createSignedUrl(path,60)).error);
      const signed=await a.storage.from(bucket).createSignedUrl(path,60);assert.equal(signed.error,null);
      assert.equal((await fetch(signed.data.signedUrl)).ok,true);
    }
    const svgPath=`${users[0]}/bad-${randomUUID()}.svg`;objects.push({bucket,path:svgPath});
    assert.ok((await a.storage.from(bucket).upload(svgPath,Buffer.from('<svg/>'),{contentType:'image/svg+xml'})).error);
    const limit=bucket==='avatars'?5242880:10485760;
    const largePath=`${users[0]}/large-${randomUUID()}.png`;objects.push({bucket,path:largePath});
    assert.ok((await a.storage.from(bucket).upload(largePath,Buffer.alloc(limit+1),{contentType:'image/png'})).error);
    const removed=await a.storage.from(bucket).remove([path]);assert.equal(removed.error,null);assert.equal(removed.data.length,1);
  }
  console.log('PASS localhost Storage: owner upload/download/upsert/delete, foreign insert/upsert/list/delete denial, private signing/public URL boundary, SVG and oversize rejection');
}finally{
  // Storage API removes blobs and metadata together. Never SQL DELETE objects.
  for(const {bucket,path} of objects){assert.equal((await admin.storage.from(bucket).remove([path])).error,null);}
  for(const id of users){assert.equal((await admin.auth.admin.deleteUser(id)).error,null);}
  console.log('PASS synthetic local Storage/account cleanup');
}
