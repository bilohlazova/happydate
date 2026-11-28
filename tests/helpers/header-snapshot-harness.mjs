// Real HomePageClient (route "/") and AuthProvider, NO PrivateSnapshotBoundary; synthetic auth/data only.
// Component lifecycle test, not hosted/browser/RLS E2E.
import { build } from "esbuild";
import { JSDOM } from "jsdom";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const mocks = path.join(root, "tests/helpers/chat-harness/mocks");
const channels = new Set();
class TestMessageChannel extends MessageChannel {
  constructor() { super(); channels.add(this); }
}

export async function headerHarness({ owner = "A", hold = false } = {}) {
  const entry = `
    import React, { act, useLayoutEffect } from 'react';
    import { createRoot } from 'react-dom/client';
    import Page from '@/components/Header';
    import { AuthProvider, useAuth } from '@/components/AuthProvider';
    // Records the committed DOM text together with the user React currently holds, after EVERY commit (layout phase,
    // before passive effects can clean anything up and before the browser could paint).
    function Probe() { const { user } = useAuth(); useLayoutEffect(() => { globalThis.__commits.push({owner: user?.id ?? null, text: document.body.textContent}); }); return null; }
    globalThis.__act = act;
    const app = createRoot(document.getElementById('root'));
    globalThis.__render = () => app.render(<AuthProvider><Page/><Probe/></AuthProvider>);
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
      maybeSingle:async()=>{const id=globalThis.__auth.session()?.user.id??null;return {data:id?{first_name:'HDR_NAME_'+id,last_name:null,full_name:null,preferred_locale:'pl',locale:'pl'}:null,error:null};}};return c;};
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
    }}],
  });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', {runScripts:"outside-only",pretendToBeVisual:true,url:"https://synthetic.test/"});
  const w = dom.window;
  Object.assign(w,{MessageChannel:TestMessageChannel,ReadableStream,Response,Headers,TextDecoder,TextEncoder});
  w.IS_REACT_ACT_ENVIRONMENT = true;
  w.HTMLElement.prototype.scrollTo = function() {};
  w.matchMedia = () => ({matches:false,addEventListener(){},removeEventListener(){}});
  w.fetch = async (url) => { if (String(url).includes("/api/happy/notifications")) { const id = w.__auth.session()?.user.id ?? null; w.__fetches = (w.__fetches ?? 0) + 1; return { ok: true, status: 200, json: async () => ({ ownerId: id, unreadCount: 3, hasMore: false, items: [{ id: "n-" + id, title: "NOTE_PRIVATE_" + id, message: null, priority: "normal", createdAt: "2026-01-01T00:00:00Z", readAt: null, openedAt: null, destination: { href: "/", kind: "home" } }] }) }; } throw new Error("Unexpected network request: " + url); };
  let session = owner ? {user:{id:owner},access_token:`synthetic-${owner}`} : null;
  const pending = [], checks = [];
  let holdAuth = false;
  w.__route = {id:"header",path:"/people"};
  w.__commits = [];
  w.__auth = {
    listeners:new Set(), session:()=>session,
    getUser:()=>holdAuth ? new Promise(resolve=>checks.push(resolve)) : Promise.resolve({data:{user:session?.user??null},error:null}),
    homeData:()=>{w.__loads=(w.__loads??0)+1;const id=session?.user.id??null;const data={userId:id,isAuthenticated:!!id,errors:[],events:id?[{id:"event-"+id,title:"HOME_PRIVATE_"+id,date:new Date(Date.now()+864e5).toISOString().slice(0,10),category:"other",personId:null,timeOfDay:null,durationMinutes:null,location:null,travelBufferMinutes:null}]:[],people:[],memories:[],pendingGiftOutcomes:[],knowledgeReviewPreferences:null,happyTasks:[],happyActions:[],happyIdeas:[],happyOccasionSignals:[],happyRescueSignals:[],giftHistory:[],personKnowledge:[],brainInsights:[],assistantPeople:[],assistantMemories:[],proactivityMode:"balanced",authMetadataName:null,email:null,profile:id?{firstName:"HOME_PRIVATE_"+id,lastName:null,fullName:null}:null};
      return hold?new Promise(resolve=>pending.push({owner:id,resolve:()=>resolve(data)})):Promise.resolve(data);}
  };
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
    async release(index) {await h.act(()=>pending[index].resolve());await h.settle();},
    async transition(type,persisted=true) {await h.act(()=>w.dispatchEvent(new w.PageTransitionEvent(type,{persisted})));await h.settle();},
    holdAuth(){holdAuth=true;},
    // Another document of the same browser changed the shared storage while this page was frozen: no auth event reaches this page.
    silentSession(next){session=next?{user:{id:next},access_token:`synthetic-${next}-silent`}:null;},
    async verifyMissing(index) {await h.act(()=>checks[index]({data:{user:null},error:{name:"AuthSessionMissingError",message:"Auth session missing!"}}));await h.settle();},
    async click(selector) {await h.act(()=>w.document.querySelector(selector).click());await h.settle();},
    async verify(index,next) {await h.act(()=>checks[index]({data:{user:next?{id:next}:null},error:null}));await h.settle();},
    async verifyError(index) {await h.act(()=>checks[index]({data:{user:null},error:{message:"offline"}}));await h.settle();},
    async dispose() {await h.act(()=>w.__unmount());w.close();for(const c of channels){c.port1.close();c.port2.close();}channels.clear();},
  };
  try {await h.act(()=>w.__render());await h.settle();}
  catch(error) {await h.dispose();throw error;}
  return h;
}
