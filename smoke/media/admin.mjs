import {createClient} from '@supabase/supabase-js';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
export const ref='xgelazzdgluuenqkymox';
export const url=`https://${ref}.supabase.co`;
export const anon=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const key=process.env.HAPPYDATE_STAGING_SERVICE_ROLE_KEY;
assert(key,'Missing Staging-only secret');
const claims=JSON.parse(Buffer.from(key.split('.')[1]??'', 'base64url').toString());
assert.equal(claims.ref,ref,'Service key project mismatch');
assert.equal(claims.role,'service_role');
export const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
export const stateFile=process.env.RUNNER_TEMP+'/happydate-media-state.json';
export function checked(result){if(result.error) throw new Error(result.error.message); return result.data;}
export async function cleanup(){
 const state=JSON.parse(await readFile(stateFile,'utf8'));
 const errors=[];
 for(const user of state.users){
  try{
   // Only UUID prefixes belonging to this run's synthetic accounts.
   for(const bucket of ['avatars','memory-images','memory-audio']){
    async function removePrefix(prefix){
     for(;;){
      const rows=checked(await admin.storage.from(bucket).list(prefix,{limit:100}));
      if(!rows.length)break;
      for(const row of rows){const path=prefix+'/'+row.name;if(row.id)checked(await admin.storage.from(bucket).remove([path]));else await removePrefix(path);}
     }
    }
    await removePrefix(user.id);
    assert.equal(checked(await admin.storage.from(bucket).list(user.id)).length,0);
   }
   checked(await admin.from('memories').delete().eq('user_id',user.id));
   checked(await admin.auth.admin.deleteUser(user.id));
   const result=await admin.auth.admin.getUserById(user.id);
   assert(!result.data?.user,'User remains after cleanup');
  }catch(e){errors.push(`${user.id}: ${e.message}`);}
 }
 assert.equal(errors.length,0,errors.join('; '));
 console.log('PASS cleanup: run-owned storage, memories, auth users removed');
}
