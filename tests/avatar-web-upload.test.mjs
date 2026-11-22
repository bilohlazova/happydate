import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile(new URL('../src/hooks/useAvatarUpload.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function hook(photoResult,native=false){
 const states=[],uploads=[],options=[],saved=[],errors=[],fetches=[];
 const exports={};
 const require=name=>{
  if(name==='react')return{useState:initial=>[initial,value=>states.push(value)]};
  if(name==='@capacitor/core')return{Capacitor:{isNativePlatform:()=>native}};
  if(name==='@capacitor/camera')return{CameraResultType:{Uri:'uri',DataUrl:'dataUrl'},CameraSource:{Prompt:'PROMPT'},Camera:{getPhoto:async o=>{
   options.push(o);
   // CameraWeb otherwise waits for an unregistered pwa-action-sheet forever.
   if(!o.webUseInput)throw new Error('PWA action sheet unavailable in web build');
   if(photoResult instanceof Error)throw photoResult;
   return photoResult;
  }}};
  if(name==='@/lib/supabaseClient')return{supabase:{storage:{from:bucket=>({upload:async(path,file,opts)=>{uploads.push({bucket,path,file,opts});return{error:null};}})}}};
  throw new Error('Unexpected dependency');
 };
 new Function('require','exports','fetch',compiled)(require,exports,async url=>{
  fetches.push(url);
  if(!native)throw new Error('Web local file fetch blocked by CSP');
  return fetch(url);
 });
 const result=exports.useAvatarUpload({userId:'synthetic-owner',onSuccess:p=>saved.push(p),onError:e=>errors.push(e)});
 return{...result,states,uploads,options,saved,errors,fetches};
}
test('web avatar selection opens the file-input route and uploads actual file bytes',async()=>{
 const h=hook({dataUrl:'data:image/png;base64,iVBORw0KGgo=',format:'png'});
 await h.pickAndUpload();
 assert.deepEqual(h.errors,[]);assert.equal(h.uploads.length,1);
 assert.equal(h.uploads[0].bucket,'avatars');assert.match(h.uploads[0].path,/^synthetic-owner\/\d+\.png$/);
 assert.equal(h.uploads[0].file.type,'image/png');assert.equal(h.uploads[0].file.size,8);
 assert.equal(h.saved.length,1);assert.equal(h.states.at(-1).status,'success');
 assert.equal(h.options[0].source,'PROMPT');assert.equal(h.options[0].resultType,'dataUrl');
 assert.deepEqual([...new Uint8Array(await h.uploads[0].file.arrayBuffer())],[137,80,78,71,13,10,26,10]);
 assert.equal(h.fetches.length,0);
});
test('native avatar keeps URI resolution',async()=>{
 const h=hook({webPath:'data:image/png;base64,iVBORw0KGgo=',format:'png'},true);
 await h.pickAndUpload();assert.deepEqual(h.errors,[]);assert.equal(h.uploads.length,1);
 assert.equal(h.options[0].resultType,'uri');
 assert.equal(h.fetches.length,1);
});
test('web preserves MIME from the selected file rather than Camera default jpeg format',async()=>{
 const h=hook({dataUrl:'data:image/webp;base64,UklGRg==',format:'jpeg'});await h.pickAndUpload();
 assert.deepEqual(h.errors,[]);assert.equal(h.uploads[0].file.type,'image/webp');
 assert.match(h.uploads[0].path,/\.webp$/);assert.equal(h.fetches.length,0);
});
test('malformed web file result is not uploaded',async()=>{
 const h=hook({dataUrl:'data:text/html;base64,PHNjcmlwdD4=',format:'png'});await h.pickAndUpload();
 assert.equal(h.uploads.length,0);assert.equal(h.errors.length,1);assert.equal(h.fetches.length,0);
});
test('cancelled avatar choice returns idle without overwriting or uploading',async()=>{
 const h=hook(new Error('User cancelled photos app'));await h.pickAndUpload();
 assert.equal(h.states.at(-1).status,'idle');assert.equal(h.uploads.length,0);assert.deepEqual(h.errors,[]);
});
