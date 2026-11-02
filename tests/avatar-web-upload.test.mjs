import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile(new URL('../src/hooks/useAvatarUpload.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function hook(photoResult){
 const states=[],uploads=[],options=[],saved=[],errors=[];
 const exports={};
 const require=name=>{
  if(name==='react')return{useState:initial=>[initial,value=>states.push(value)]};
  if(name==='@capacitor/camera')return{CameraResultType:{Uri:'uri'},CameraSource:{Prompt:'PROMPT'},Camera:{getPhoto:async o=>{
   options.push(o);
   // CameraWeb otherwise waits for an unregistered pwa-action-sheet forever.
   if(!o.webUseInput)throw new Error('PWA action sheet unavailable in web build');
   if(photoResult instanceof Error)throw photoResult;
   return photoResult;
  }}};
  if(name==='@/lib/supabaseClient')return{supabase:{storage:{from:bucket=>({upload:async(path,file,opts)=>{uploads.push({bucket,path,file,opts});return{error:null};}})}}};
  throw new Error('Unexpected dependency');
 };
 new Function('require','exports',compiled)(require,exports);
 const result=exports.useAvatarUpload({userId:'synthetic-owner',onSuccess:p=>saved.push(p),onError:e=>errors.push(e)});
 return{...result,states,uploads,options,saved,errors};
}
test('web avatar selection opens the file-input route and uploads actual file bytes',async()=>{
 const h=hook({webPath:'data:image/png;base64,iVBORw0KGgo=',format:'png'});
 await h.pickAndUpload();
 assert.deepEqual(h.errors,[]);assert.equal(h.uploads.length,1);
 assert.equal(h.uploads[0].bucket,'avatars');assert.match(h.uploads[0].path,/^synthetic-owner\/\d+\.png$/);
 assert.equal(h.uploads[0].file.type,'image/png');assert.equal(h.uploads[0].file.size,8);
 assert.equal(h.saved.length,1);assert.equal(h.states.at(-1).status,'success');
 assert.equal(h.options[0].source,'PROMPT');assert.equal(h.options[0].resultType,'uri');
});
test('cancelled avatar choice returns idle without overwriting or uploading',async()=>{
 const h=hook(new Error('User cancelled photos app'));await h.pickAndUpload();
 assert.equal(h.states.at(-1).status,'idle');assert.equal(h.uploads.length,0);assert.deepEqual(h.errors,[]);
});
