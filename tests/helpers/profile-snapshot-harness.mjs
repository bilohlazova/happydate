// Real page, profile UI, auth provider and boundary; synthetic auth/data only.
// This is a component lifecycle test, not hosted/browser/RLS E2E.
import { build } from "esbuild";
import { JSDOM } from "jsdom";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const mocks = path.join(root, "tests/helpers/chat-harness/mocks");
const channels = new Set();
class TestMessageChannel extends MessageChannel {
  constructor() { super(); channels.add(this); }
}

export async function profileHarness({ owner = "A", bare = false, unresolved = false } = {}) {
  const entry = `
    import React, { act, Profiler } from 'react';
    import { createRoot } from 'react-dom/client';
    import Page from '@/app/people/[id]/page';
    import Boundary from '@/components/PrivateSnapshotBoundary';
    import { AuthProvider } from '@/components/AuthProvider';
    import { buildPersonProfileViewModel } from '@/lib/people/buildPeopleViewModels';
    globalThis.__model = (owner, id, marker) => buildPersonProfileViewModel({
      person: {id, user_id: owner, name: marker, relationship: 'mother', relation_label: null,
        relation_key: 'mother', relation_category: 'family', gender: 'female', birthday: null,
        created_at: '2026-01-01T00:00:00Z'}, knowledge: [],
      happyConversations: [{id: 'turn-'+id, user_id: owner, person_id: id,
        user_message: marker+'-HISTORY', happy_response: marker+'-REPLY', created_at: '2026-01-01T00:00:00Z'}]
    });
    globalThis.__act = act;
    const app = createRoot(document.getElementById('root'));
    globalThis.__render = () => app.render(<AuthProvider><Profiler id='private' onRender={() =>
      globalThis.__commits.push({owner: globalThis.__auth.session()?.user.id ?? null, route: globalThis.__route.id, text: document.body.textContent})
    }>${bare ? "<Page/>" : "<Boundary><Page/></Boundary>"}</Profiler></AuthProvider>);
    globalThis.__unmount = () => app.unmount();
  `;
  const navigation = `
    export const useParams = () => ({id:globalThis.__route.id});
    export const usePathname = () => globalThis.__route.path;
    const params = new URLSearchParams('view=history');
    export const useSearchParams = () => {params.set('view',globalThis.__route.view ?? 'history');return params;};
    const router = {push(){},replace(){},refresh(){}};
    export const useRouter = () => router;
  `;
  const auth = `
    const chain = () => {const c={select:()=>c,eq:()=>c,order:()=>c,limit:()=>c,
      maybeSingle:async()=>({data:null,error:null})};return c;};
    export const supabase = {from:chain,auth:{
      getUser:()=>globalThis.__auth.getUser(),
      getSession:async()=>({data:{session:globalThis.__auth.session()}}),
      onAuthStateChange:fn=>{globalThis.__auth.listeners.add(fn);return {data:{subscription:{unsubscribe:()=>globalThis.__auth.listeners.delete(fn)}}};},
      signOut:async()=>{}
    }};
  `;
  const result = await build({
    stdin: { contents: entry, resolveDir: root, loader: "jsx" }, bundle: true,
    write: false, format: "iife", platform: "browser", jsx: "automatic", logLevel: "silent",
    absWorkingDir: root, define: { "process.env.NODE_ENV": '"test"' },
    alias: { "@": path.join(root, "src"), "next-intl": path.join(mocks, "next-intl.js"), "next/link": path.join(mocks, "next-link.js") },
    plugins: [{ name: "synthetic-profile", setup(b) {
      b.onResolve({filter:/^next\/navigation$/},()=>({path:"navigation",namespace:"synthetic"}));
      b.onResolve({filter:/^next\/image$/},()=>({path:"image",namespace:"synthetic"}));
      b.onResolve({filter:/supabaseClient(\.ts)?$/},()=>({path:"auth",namespace:"synthetic"}));
      b.onLoad({filter:/.*/,namespace:"synthetic"},({path:p})=>({contents:p==="navigation"?navigation:p==="auth"?auth:"export default function Image(){return null;}",loader:"js"}));
      b.onResolve({filter:/loadHome(\.ts)?$/},()=>({path:path.join(mocks,"loadHome.js")}));
      b.onLoad({filter:/people\.loaders\.ts$/},async({path:p})=>({
        contents:(await readFile(p,"utf8")).replace(/export async function loadPersonProfile\([\s\S]*?\n}\n/,
          'export async function loadPersonProfile(personId: string): Promise<PersonProfileViewModel> {return globalThis.__loadProfile(personId);}\n'),loader:"ts"
      }));
    }}],
  });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', {runScripts:"outside-only",pretendToBeVisual:true,url:"https://synthetic.test/people/person-A"});
  const w = dom.window;
  Object.assign(w,{MessageChannel:TestMessageChannel,ReadableStream,Response,Headers,TextDecoder,TextEncoder});
  w.IS_REACT_ACT_ENVIRONMENT = true;
  w.HTMLElement.prototype.scrollTo = function() {};
  w.matchMedia = () => ({matches:false,addEventListener(){},removeEventListener(){}});
  w.fetch = async () => { throw new Error("Unexpected network request in synthetic profile test"); };
  let session = owner ? {user:{id:owner},access_token:`synthetic-${owner}`} : null;
  const pending = [], checks = [];
  let holdAuth = unresolved;
  w.__route = {id:"person-A",path:"/people/person-A"};
  w.__commits = [];
  w.__auth = {
    listeners:new Set(), session:()=>session,
    getUser:()=>holdAuth ? new Promise(resolve=>checks.push(resolve)) : Promise.resolve({data:{user:session?.user??null},error:null}),
    homeData:async()=>({userId:session?.user.id,isAuthenticated:!!session,errors:[],events:[],brainInsights:[],assistantPeople:[],assistantMemories:[],profile:null})
  };
  w.__loadProfile = id => new Promise(resolve=>pending.push({id,owner:session?.user.id,resolve}));
  try { w.eval(result.outputFiles[0].text); }
  catch(error) {w.close();for(const c of channels){c.port1.close();c.port2.close();}channels.clear();throw error;}
  const h = {
    w,pending,checks,
    text:()=>w.document.body.textContent,
    act:fn=>w.__act(async()=>{await fn();}),
    async settle(){await h.act(async()=>{await new Promise(r=>setTimeout(r,15));});},
    async auth(next,event="SIGNED_IN") {
      session=next?{user:{id:next},access_token:`synthetic-${next}-${event}`} : null;
      await h.act(()=>{for(const fn of w.__auth.listeners) fn(event,session);});
      await h.settle();
    },
    async resolve(index,marker=pending[index].owner) {
      const request=pending[index];
      await h.act(()=>request.resolve(w.__model(request.owner,request.id,marker)));
      await h.settle();
    },
    async route(id) {w.__route={id,path:`/people/${id}`};await h.act(()=>w.__render());await h.settle();},
    async transition(type,persisted=true) {await h.act(()=>w.dispatchEvent(new w.PageTransitionEvent(type,{persisted})));await h.settle();},
    holdAuth(){holdAuth=true;},
    async verify(index,next) {await h.act(()=>checks[index]({data:{user:next?{id:next}:null},error:null}));await h.settle();},
    async verifyError(index) {await h.act(()=>checks[index]({data:{user:null},error:{message:"offline"}}));await h.settle();},
    async dispose() {await h.act(()=>w.__unmount());w.close();for(const c of channels){c.port1.close();c.port2.close();}channels.clear();},
  };
  try {await h.act(()=>w.__render());await h.settle();}
  catch(error) {await h.dispose();throw error;}
  return h;
}
