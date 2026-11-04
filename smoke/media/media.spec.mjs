import {test,expect as baseExpect} from '@playwright/test';
import {createClient} from '@supabase/supabase-js';
import {readFile} from 'node:fs/promises';
import {admin,checked,stateFile,url,anon,ref} from './admin.mjs';
test.setTimeout(240000);
const expect=baseExpect.configure({timeout:20000});
const image={name:'smoke.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j1ioAAAAASUVORK5CYII=','base64')};
async function objects(bucket,id){return checked(await admin.storage.from(bucket).list(id,{limit:100}));}
const ownerClients=new Map();
async function profile(id){return checked(await ownerClients.get(id).from('profiles').select('avatar_url').eq('id',id).single());}
async function memories(id){return checked(await ownerClients.get(id).from('memories').select('id,images,title').eq('user_id',id));}
test('avatar + Memory lifecycle and two-account RLS',async({browser})=>{
 const state=JSON.parse(await readFile(stateFile,'utf8'));
 const contexts=[]; const clients=[];const pages=[];
 try{
  for(const user of state.users){
   const client=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
   const {session}=checked(await client.auth.signInWithPassword({email:user.email,password:user.password}));
   clients.push(client);ownerClients.set(user.id,client);
   const context=await browser.newContext({locale:'en-US'});contexts.push(context);
   await context.addCookies([{name:'happydate_locale',value:'en',url:'http://127.0.0.1:3000'}]);
   await context.addInitScript(({ref,session})=>{localStorage.setItem(`sb-${ref}-auth-token`,JSON.stringify(session));},{ref,session});
   // Prevent accidental requests to any other Supabase project.
   await context.route('**/*',route=>{
    const host=new URL(route.request().url()).hostname;
    return host.endsWith('.supabase.co')&&host!==`${ref}.supabase.co`?route.abort():route.continue();
   });
   const page=await context.newPage();pages.push(page);
   page.on('dialog',dialog=>dialog.accept());
   await expect(async()=>{const r=await page.goto('http://127.0.0.1:3000/profile');expect(r.status()).toBe(200);}).toPass({timeout:60000});
   for(let i=0;i<2;i++){
    const previous=(await profile(user.id)).avatar_url;
    const chooser=page.waitForEvent('filechooser');
    await page.getByRole('button',{name:'Change profile photo',exact:true}).click();
    await (await chooser).setFiles({...image,name:`avatar-${i}.png`});
    await expect.poll(async()=>(await profile(user.id)).avatar_url).not.toBe(previous);
    await expect.poll(async()=>(await objects('avatars',user.id)).length).toBe(1);
    await expect(page.getByAltText('Profile photo')).toBeVisible();
    await expect.poll(()=>page.getByAltText('Profile photo').evaluate(img=>img.complete&&img.naturalWidth>0)).toBeTruthy();
   }
   await page.getByRole('button',{name:'Remove avatar',exact:true}).click();
   await expect.poll(async()=>(await profile(user.id)).avatar_url).toBeNull();
   await expect.poll(async()=>(await objects('avatars',user.id)).length).toBe(0);
   console.log('PASS avatar upload, replacement, rendered photo and removal');
   await page.goto('http://127.0.0.1:3000/notes');
   await page.locator('.hd-add-btn').click();
   await page.locator('.hd-type-option').filter({hasText:'Keep an important moment'}).click();
   await page.locator('#memory-editor-title-input').fill(`smoke-${state.run}-${user.id}`);
   await page.locator('textarea').fill('Synthetic media lifecycle smoke');
   const chooser=page.waitForEvent('filechooser');
   await page.getByRole('button',{name:/Choose.*gallery/i}).click();
   await (await chooser).setFiles([image,{...image,name:'second.png'}]);
   await page.locator('.hd-btn-save').click();
   await expect.poll(async()=>(await memories(user.id)).length).toBe(1);
   await expect.poll(async()=>(await memories(user.id))[0]?.images?.length).toBe(2);
   await expect(page.locator('.hd-card-images img').first()).toBeVisible();
   expect(await page.locator('.hd-card-images img').first().evaluate(img=>img.complete&&img.naturalWidth>0)).toBeTruthy();
   await expect.poll(async()=>(await objects('memory-images',user.id)).length).toBe(2);
  }
  for(let i=0;i<2;i++){
   const own=state.users[i],other=state.users[1-i],client=clients[i];
   const foreign=(await memories(other.id))[0];const path=foreign.images[0];
   expect(checked(await client.from('memories').select('id').eq('user_id',other.id))).toEqual([]);
   expect(checked(await client.from('memories').update({title:'forbidden'}).eq('id',foreign.id).select('id'))).toEqual([]);
   expect(checked(await client.from('memories').delete().eq('id',foreign.id).select('id'))).toEqual([]);
   expect((await client.storage.from('memory-images').download(path)).error).toBeTruthy();
   expect((await client.storage.from('memory-images').createSignedUrl(path,60)).error).toBeTruthy();
   expect((await client.storage.from('memory-images').upload(`${other.id}/forbidden.png`,image.buffer,{contentType:'image/png'})).error).toBeTruthy();
   await client.storage.from('memory-images').remove([path]);
   expect((await objects('memory-images',other.id)).some(x=>path.endsWith('/'+x.name))).toBeTruthy();
   expect((await memories(other.id))[0].title).toBe(foreign.title);
   console.log('PASS cross-account Memory read/update/delete and private Storage read/sign/upload/delete isolation');
  }
  for(let i=0;i<2;i++){
   const user=state.users[i],page=pages[i];
   await page.locator('.hd-card-menu-btn').click();
   await page.getByRole('menuitem',{name:'Edit',exact:true}).click();
   await page.getByRole('button',{name:/Remove existing image 1/i}).click();
   await page.locator('.hd-btn-save').click();
   await expect.poll(async()=>(await memories(user.id))[0]?.images?.length).toBe(1);
   await expect.poll(async()=>(await objects('memory-images',user.id)).length).toBe(1);
   await page.locator('.hd-card-menu-btn').click();
   await page.getByRole('menuitem',{name:'Delete',exact:true}).click();
   await expect.poll(async()=>(await memories(user.id)).length).toBe(0);
   await expect.poll(async()=>(await objects('memory-images',user.id)).length).toBe(0);
   console.log('PASS Memory upload, rendered private images, edit cleanup and delete cleanup');
  }
 }finally{for(const client of clients)await client.auth.signOut();for(const context of contexts)await context.close();}
});
