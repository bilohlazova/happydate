import {test,expect as baseExpect} from '@playwright/test';
import {createClient} from '@supabase/supabase-js';
import {readFile,mkdir} from 'node:fs/promises';
import {admin,checked,stateFile,url,anon,ref} from './admin.mjs';
test.setTimeout(180000); const expect=baseExpect.configure({timeout:20000});
const image={name:'notes.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j1ioAAAAASUVORK5CYII=','base64')};
async function memories(id){return checked(await admin.from('memories').select('id,title,images').eq('user_id',id));}
async function objects(id){return checked(await admin.storage.from('memory-images').list(id,{limit:100}));}
async function session(user){return checked(await createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}}).auth.signInWithPassword({email:user.email,password:user.password}));}
async function pageFor(browser,user,viewport){
 const s=await session(user); const context=await browser.newContext({viewport,isMobile:viewport.width<600,hasTouch:viewport.width<600,locale:'en-US'});
 await context.addCookies([{name:'happydate_locale',value:'en',url:'http://127.0.0.1:3000'}]);
 await context.addInitScript(({ref,session})=>localStorage.setItem(`sb-${ref}-auth-token`,JSON.stringify(session)),{ref,session:s.session});
 await context.route('**/*',route=>{const host=new URL(route.request().url()).hostname;return host.endsWith('.supabase.co')&&host!==`${ref}.supabase.co`?route.abort():route.continue();});
 const page=await context.newPage(); page.setDefaultTimeout(15000); page.on('dialog',d=>d.accept()); await page.goto('http://127.0.0.1:3000/notes'); await expect(page.locator('.hd-add-btn')).toBeVisible(); return {context,page};
}
test('Notes pointer/touch create-edit-delete, Storage cleanup and two-account RLS',async({browser})=>{
 const state=JSON.parse(await readFile(stateFile,'utf8')); await mkdir('evidence',{recursive:true}); const owner=state.users[0],other=state.users[1];
 const desktop=await pageFor(browser,owner,{width:1440,height:900}); const mobile=await pageFor(browser,owner,{width:390,height:844}); const second=await pageFor(browser,other,{width:360,height:800});
 try{
  const add=desktop.page.locator('.hd-add-btn'); await add.click(); await desktop.page.locator('.hd-type-option').filter({hasText:'Keep an important moment'}).click();
  await desktop.page.locator('#memory-editor-title-input').fill(`notes-${state.run}-🧪`); await desktop.page.locator('textarea').fill('Unicode memory — створено через реальний pointer click');
  const chooser=desktop.page.waitForEvent('filechooser'); await desktop.page.getByRole('button',{name:/Choose.*gallery/i}).click(); await (await chooser).setFiles(image); await desktop.page.locator('.hd-btn-save').click();
  await expect.poll(async()=>(await memories(owner.id)).length).toBe(1); await expect.poll(async()=>(await objects(owner.id)).length).toBe(1); await expect(desktop.page.locator('.hd-card')).toContainText('notes-');
  await mobile.page.reload(); await expect(mobile.page.locator('.hd-card')).toBeVisible(); const menu=mobile.page.locator('.hd-card-menu-btn'); await menu.click();
  const popup=mobile.page.locator('.hd-card-menu-popup'); await expect(popup).toBeVisible(); const box=await popup.boundingBox(); const header=await mobile.page.locator('header').boundingBox().catch(()=>null); if(header&&box) expect(box.y+box.height).toBeGreaterThan(header.y+header.height);
  await mobile.page.getByRole('menuitem',{name:'Edit',exact:true}).click(); await mobile.page.locator('#memory-editor-title-input').fill(`edited-${state.run}-✅`); await mobile.page.locator('.hd-btn-save').click(); await expect.poll(async()=>(await memories(owner.id))[0]?.title).toContain(`edited-${state.run}`);
  await mobile.page.locator('.hd-card-menu-btn').click(); await mobile.page.getByRole('menuitem',{name:'Delete',exact:true}).click(); await expect.poll(async()=>(await memories(owner.id)).length).toBe(0); await expect.poll(async()=>(await objects(owner.id)).length).toBe(0); await expect(mobile.page.locator('.hd-empty')).toBeVisible();
  const foreign=await memories(owner.id); expect(foreign).toEqual([]); expect(checked(await admin.from('memories').select('id').eq('user_id',other.id))).toEqual([]);
  await expect(second.page.locator('.hd-empty')).toBeVisible(); console.log('PASS Notes desktop/mobile pointer lifecycle, Unicode, row deletion and physical image cleanup');
 } finally {await desktop.context.close();await mobile.context.close();await second.context.close();}
});

test('Knowledge separation: person facts stay in People while real memories stay global',async({browser})=>{
 const state=JSON.parse(await readFile(stateFile,'utf8')); const owner=state.users[0],other=state.users[1];
 const desktop=await pageFor(browser,owner,{width:1440,height:900});
 const android=await pageFor(browser,owner,{width:390,height:844});
 const iphone=await pageFor(browser,owner,{width:393,height:852});
 const second=await pageFor(browser,other,{width:360,height:800});
 const fact=`Anna loves coffee ${state.run}`;
 const editedFact=`Anna prefers quiet coffee ${state.run}`;
 const memoryTitle=`Anna lake memory ${state.run}`;
 const memoryBody=`A real shared memory with Anna ${state.run}`;
 try {
  await desktop.page.goto('http://127.0.0.1:3000/people');
  await desktop.page.getByRole('button',{name:'Add person',exact:true}).click();
  await desktop.page.getByText('Add manually',{exact:true}).click();
  await desktop.page.locator('#name').fill('Anna');
  await desktop.page.getByRole('button',{name:'Save person',exact:true}).click();
  await expect(desktop.page).toHaveURL(/\/people$/);
  await desktop.page.locator('a[href^="/people/"]').filter({hasText:'Anna'}).click();
  await expect(desktop.page).toHaveURL(/\/people\/[^/?#]+/);
  const personUrl=desktop.page.url().replace(/\?.*$/,'');
  await desktop.page.goto(`${personUrl}?view=about`);
  await expect(desktop.page.getByText('About Anna',{exact:true}).first()).toBeVisible();
  await desktop.page.getByRole('button',{name:'Add',exact:true}).click();
  await desktop.page.locator('#about-person-value').fill(fact);
  await desktop.page.getByRole('button',{name:'Save',exact:true}).click();
  await expect(desktop.page.getByText(fact,{exact:true})).toBeVisible();
  const personId=personUrl.split('/').pop();
  await expect.poll(async()=>checked(await admin.from('memories').select('id,type,person_id,value_text,content').eq('user_id',owner.id).eq('person_id',personId))).toHaveLength(1);

  await desktop.page.goto('http://127.0.0.1:3000/notes');
  await expect(desktop.page.getByText(fact,{exact:true})).toHaveCount(0);
  const search=desktop.page.locator('input[placeholder*="Search"]');
  if(await search.count()) { await search.fill('coffee'); await expect(desktop.page.getByText(fact,{exact:true})).toHaveCount(0); await search.fill(''); }
  await desktop.page.locator('#notes-person-filter').selectOption(personId);
  await expect(desktop.page.getByText(fact,{exact:true})).toHaveCount(0);
  await desktop.page.locator('#notes-person-filter').selectOption('');

  await desktop.page.locator('.hd-add-btn').click();
  await desktop.page.locator('.hd-type-option').filter({hasText:'Keep an important moment'}).click();
  await desktop.page.locator('#memory-editor-title-input').fill(memoryTitle);
  await desktop.page.locator('#memory-editor-person').selectOption(personId);
  await desktop.page.locator('#memory-editor-content').fill(memoryBody);
  await desktop.page.locator('.hd-btn-save').click();
  await expect.poll(async()=>checked(await admin.from('memories').select('id').eq('user_id',owner.id).eq('title',memoryTitle))).toHaveLength(1);
  await expect(desktop.page.getByText(memoryTitle,{exact:true})).toBeVisible();
  await expect(desktop.page.getByText(fact,{exact:true})).toHaveCount(0);

  await android.page.goto(`${personUrl}?view=about`);
  await expect(android.page.getByText(fact,{exact:true})).toBeVisible();
  await android.page.getByRole('button',{name:`Actions for “${fact}”`}).click();
  await android.page.getByRole('button',{name:'Edit',exact:true}).click();
  await android.page.locator('#about-person-value').fill(editedFact);
  await android.page.getByRole('button',{name:'Save',exact:true}).click();
  await expect(android.page.getByText(editedFact,{exact:true})).toBeVisible();
  await expect(android.page.getByText(fact,{exact:true})).toHaveCount(0);
  await iphone.page.goto(`${personUrl}?view=about`);
  await expect(iphone.page.getByText(editedFact,{exact:true})).toBeVisible();
  await iphone.page.getByRole('button',{name:`Actions for “${editedFact}”`}).click();
  await iphone.page.getByRole('button',{name:'Delete',exact:true}).first().click();
  await expect(iphone.page.getByRole('heading',{name:'Delete fact'})).toBeVisible();
  await iphone.page.getByRole('button',{name:'Delete',exact:true}).last().click();
  await expect.poll(async()=>checked(await admin.from('memories').select('id').eq('user_id',owner.id).eq('value_text',editedFact))).toHaveLength(0);
  await iphone.page.reload();
  await expect(iphone.page.getByText(editedFact,{exact:true})).toHaveCount(0);
  await iphone.page.goto('http://127.0.0.1:3000/notes');
  await expect(iphone.page.getByText(memoryTitle,{exact:true})).toBeVisible();
  await expect(iphone.page.getByText(editedFact,{exact:true})).toHaveCount(0);
  await second.page.goto('http://127.0.0.1:3000/people');
  await expect(second.page.getByText('Anna',{exact:true})).toHaveCount(0);
  expect(checked(await admin.from('memories').select('id').eq('user_id',other.id))).toEqual([]);
  console.log('PASS Knowledge separation desktop/Android/iPhone-like: fact profile-only, real memory global, edit/delete/reload and RLS isolation');
 } finally { await desktop.context.close(); await android.context.close(); await iphone.context.close(); await second.context.close(); }
});
