import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
// Capture local keys in memory only; never print CLI output or attach it to errors.
const status = spawnSync('npx', ['--yes','supabase@2.122.0','status','--workdir',process.env.LOCAL_SUPABASE_WORKDIR ?? process.cwd(),'-o','json'], {encoding:'utf8',stdio:['ignore','pipe','pipe']});
if (status.status !== 0) throw new Error('Local Supabase status unavailable; check LOCAL_SUPABASE_WORKDIR');
let config;
try { config = JSON.parse(status.stdout); } catch { throw new Error('Invalid local Supabase status response'); }
const url = config.API_URL;
assert.ok(['127.0.0.1','localhost'].includes(new URL(url).hostname));
const options = {auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
const admin = createClient(url, config.SERVICE_ROLE_KEY, options);
const clients = [createClient(url, config.ANON_KEY, options),createClient(url, config.ANON_KEY, options)];
const users=[];
try {
  for (const client of clients) {
    const email=`release-${randomUUID()}@example.test`, password=`Audit-${randomUUID()}-aA1!`;
    const signed=await client.auth.signUp({email,password}); assert.equal(signed.error,null); assert.ok(signed.data.user?.id); users.push(signed.data.user.id);
    if (!signed.data.session) { const confirmed=await admin.auth.admin.updateUserById(signed.data.user.id,{email_confirm:true}); assert.equal(confirmed.error,null); }
    const login=await client.auth.signInWithPassword({email,password}); assert.equal(login.error,null); assert.ok(login.data.session);
    const refreshed=await client.auth.refreshSession(); assert.equal(refreshed.error,null); assert.ok(refreshed.data.session);
    const profile=await client.from('profiles').select('id').eq('id',signed.data.user.id).single(); assert.equal(profile.error,null);
    const survey=await client.rpc('save_my_onboarding_survey',{p_likes:['books'],p_dislikes:[],p_dream:'Synthetic',p_notes:'',p_special_dates:null});assert.equal(survey.error,null);
    const loggedOut=await client.auth.signOut(); assert.equal(loggedOut.error,null);assert.equal((await client.auth.getSession()).data.session,null);
    assert.equal((await client.auth.signInWithPassword({email,password})).error,null);
  }
  const [a,b]=clients;
  const owned=await b.from('people').insert({user_id:users[1],name:'Synthetic private B'}).select('id').single();assert.equal(owned.error,null);
  assert.deepEqual((await a.from('people').select('id').eq('id',owned.data.id)).data,[]);
  const bad=await a.from('people').insert({user_id:users[1],name:'forged'});assert.ok(bad.error);
  const update=await a.from('people').update({name:'forged'}).eq('id',owned.data.id).select('id');assert.equal(update.error,null);assert.deepEqual(update.data,[]);
  const del=await a.from('people').delete().eq('id',owned.data.id).select('id');assert.equal(del.error,null);assert.deepEqual(del.data,[]);
  const ownUpdate=await b.from('people').update({name:'Synthetic updated B'}).eq('id',owned.data.id).select('name').single();assert.equal(ownUpdate.error,null);
  const ownDelete=await b.from('people').delete().eq('id',owned.data.id).select('id');assert.equal(ownDelete.error,null);assert.equal(ownDelete.data.length,1);
  console.log('PASS local HTTP: two signups, confirmation, onboarding/profile, login, refresh, logout/relogin, owner CRUD and foreign read/insert/update/delete isolation');
} finally {
  for (const id of users) {const result=await admin.auth.admin.deleteUser(id);assert.equal(result.error,null);}
  console.log('PASS synthetic local account cleanup');
}
