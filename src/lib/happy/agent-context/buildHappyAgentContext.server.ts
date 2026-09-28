import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { activeTasks, daysUntil, emptyContext, gifts, recentActions } from "./happyAgentContext.selectors";
import type { HappyAgentContext } from "./happyAgentContext.types";
import { listKnowledgeForOwnedPersonWithClient } from "@/lib/repositories/knowledgeRepository";
import { buildPersonMemoryProfile, selectAuthoritativeContextForAi } from "@/lib/memory-engine/personMemoryProfile";
import { selectKnowledgeContext } from "@/lib/knowledge/knowledgeLayer";
import { getHappyTasksForEvent } from "../task-engine/happyEventTasks.server";

export type HappyAgentContextInput = { client: SupabaseClient; userId: string; locale: string; timezone?: string; personId?: string; eventId?: string; taskId?: string; now?: Date };
export type HappyAgentContextResult = { kind: "ok"; context: HappyAgentContext } | { kind: "not_found" | "data_unavailable"; resource?: "person" | "event" | "task" };
const validZone = (value?: string) => { try { if (value) Intl.DateTimeFormat("en", { timeZone: value }); return value ?? "UTC"; } catch { return "UTC"; } };

export async function buildHappyAgentContext(input: HappyAgentContextInput): Promise<HappyAgentContextResult> {
  const { client, userId, personId, eventId, taskId } = input;
  const context = emptyContext({ id: userId, locale: input.locale, timezone: validZone(input.timezone) });
  if (personId) { const { data, error } = await client.from("people").select("id,name,relationship,relation_label,birthday,gender").eq("id", personId).eq("user_id", userId).maybeSingle(); if (error) return { kind: "data_unavailable" }; if (!data) return { kind: "not_found", resource: "person" }; const p = data as { id:string; name:string; relationship:string|null; relation_label:string|null; birthday:string|null; gender:string|null }; context.person = { id:p.id, name:p.name, relationship:p.relation_label ?? p.relationship, birthday:p.birthday, gender:p.gender === "female" || p.gender === "male" || p.gender === "other" ? p.gender : null }; }
  if (eventId) { const { data, error } = await client.from("events").select("id,category,date").eq("id", eventId).eq("user_id", userId).maybeSingle(); if (error) return { kind:"data_unavailable" }; if (!data) return { kind:"not_found", resource:"event" }; const e=data as {id:string;category:string|null;date:string}; context.event={id:e.id,type:e.category ?? "event",date:e.date,daysUntil:daysUntil(e.date,input.now ?? new Date())}; }
  if (taskId) { const { data,error }=await client.from("happy_tasks").select("id").eq("id",taskId).eq("user_id",userId).maybeSingle(); if(error)return {kind:"data_unavailable"}; if(!data)return {kind:"not_found",resource:"task"}; }
  const person = context.person?.id;
  if (context.person) {
    try {
      const knowledge = selectKnowledgeContext(await listKnowledgeForOwnedPersonWithClient(client, { userId, personId: context.person.id }), { personIds: [context.person.id], limit: 20 });
      const project = (item: typeof knowledge[number]) => ({ id:item.id, text:item.value ?? item.title ?? item.summary ?? "", importance:item.importance ?? 0, kind:item.kind, category:item.category ?? null, polarity:item.polarity ?? null, occurredOn:item.occurredOn ?? null });
      context.knowledge.likes = knowledge.filter((item)=>item.polarity === "likes" || item.polarity === "prefers").map(project);
      context.knowledge.dislikes = knowledge.filter((item)=>item.polarity === "dislikes" || item.polarity === "avoids").map(project);
      context.knowledge.importantFacts = knowledge.filter((item)=>item.kind === "fact").map(project);
      const profile = buildPersonMemoryProfile({ personId:context.person.id, personName:context.person.name, relationLabel:context.person.relationship, birthday:context.person.birthday, knowledge });
      // Facts already occupy importantFacts. Keep the agent memory slice to
      // experiences so one canonical fact is not represented twice.
      context.memories = selectAuthoritativeContextForAi(profile).factsAndMemories
        .filter((entry) => entry.epistemicType === "memory")
        .slice(0, 12);
    } catch { return { kind:"data_unavailable" }; }
  }
  const [giftQuery, taskQuery, ideaQuery, actionQuery] = await Promise.all([
    (person ? client.from("gifts").select("id,title,lifecycle,event_id,created_at").eq("user_id",userId).eq("person_id",person) : client.from("gifts").select("id,title,lifecycle,event_id,created_at").eq("user_id",userId)).order("created_at",{ascending:false}).limit(10),
    eventId ? getHappyTasksForEvent(client, userId, eventId) : (person ? client.from("happy_tasks").select("id,type,title,status,person_id,event_id,started_at").eq("user_id",userId).eq("person_id",person) : client.from("happy_tasks").select("id,type,title,status,person_id,event_id,started_at").eq("user_id",userId)).in("status",["active","waiting_user","paused"]).order("started_at",{ascending:false}).limit(10),
    (person ? client.from("happy_ideas").select("id,type,title,message,status,person_id,event_id,expires_at,created_at").eq("user_id",userId).eq("person_id",person) : client.from("happy_ideas").select("id,type,title,message,status,person_id,event_id,expires_at,created_at").eq("user_id",userId)).in("status",["new","shown","accepted"]).order("created_at",{ascending:false}).limit(10),
    client.from("happy_actions").select("id,type,status,task_id,step_id,executed_at,created_at").eq("user_id",userId).order("created_at",{ascending:false}).limit(10),
  ]);
  if ([giftQuery,taskQuery,ideaQuery,actionQuery].some((r)=>r.error)) return {kind:"data_unavailable"};
  context.gifts=gifts((giftQuery.data ?? []).map((r) => ({id:r.id,title:r.title ?? "",lifecycle:r.lifecycle,eventId:r.event_id,createdAt:r.created_at ?? ""})));
  context.activeTasks=activeTasks((taskQuery.data ?? []).map((r)=>({id:r.id,type:r.type,title:r.title,status:r.status,personId:r.person_id,eventId:r.event_id,startedAt:r.started_at})));
  context.activeIdeas=(ideaQuery.data ?? []).map((r)=>({id:r.id,type:r.type,title:r.title,message:r.message,status:r.status,personId:r.person_id,eventId:r.event_id,expiresAt:r.expires_at,createdAt:r.created_at}));
  context.recentActions=recentActions((actionQuery.data ?? []).map((r)=>({id:r.id,type:r.type,status:r.status,taskId:r.task_id,stepId:r.step_id,executedAt:r.executed_at,createdAt:r.created_at})));
  return {kind:"ok",context};
}
