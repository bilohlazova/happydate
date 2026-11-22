import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import test from 'node:test';
import './server-test-loader.mjs';
registerHooks({resolve(specifier,context,next){if(specifier==='next/server')return {url:new URL('../node_modules/next/server.js',import.meta.url).href,shortCircuit:true};return next(specifier,context);}});
process.env.NEXT_PUBLIC_SUPABASE_URL='https://synthetic.invalid';
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='sb_publishable_synthetic';
process.env.HAPPY_LEARNING_TOKEN_SECRET='synthetic-signing-material-for-local-tests';
process.env.OPENAI_API_KEY='synthetic-local-only';
const uuid='11111111-1111-4111-8111-111111111111';
const routes=[
 ['gifts','../src/app/api/ai/gift-suggestions/route.ts',{personId:uuid}],
 ['learning','../src/app/api/memory-capture/detect/route.ts',{personId:uuid,userMessage:'Anna likes ceramics.',locale:'en'}],
 ['agent','../src/app/api/happy/agent/route.ts',{intent:'birthday_gift',personId:uuid}],
 ['tasks','../src/app/api/happy/tasks/[id]/continue/route.ts',undefined],
 ['rescue','../src/app/api/happy/occasions/[occurrenceKey]/rescue/route.ts',{}],
];
for(const[name,path,body]of routes){
 const handler=(await import(path)).POST;
 test(`${name} missing or invalid bearer cannot reach paid provider`,async()=>{
  const previous=globalThis.fetch;let paid=0;
  globalThis.fetch=async(input)=>{if(String(input).startsWith('https://api.openai.com')){paid++;throw Error('unexpected provider');}assert.ok(String(input).startsWith('https://synthetic.invalid'));return Response.json({message:'synthetic invalid session',code:'bad_jwt'},{status:401});};
  try{for(const bearer of [null,'synthetic-invalid']){
   const request=new Request('http://localhost/probe',{method:'POST',headers:{'Content-Type':'application/json',...(bearer?{Authorization:`Bearer ${bearer}`}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
   const r=await handler(request,{params:Promise.resolve({id:uuid,occurrenceKey:'occasion:pl_boys_day:2026'})});assert.equal(r.status,401);
  }assert.equal(paid,0);}finally{globalThis.fetch=previous;}
 });
}
