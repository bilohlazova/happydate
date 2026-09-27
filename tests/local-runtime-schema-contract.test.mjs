import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

const enabled = process.env.RUN_LOCAL_SUPABASE_SCHEMA_TESTS === "1";

const requiredColumns = {
  profiles: {
    id: "uuid", full_name: "text", phone: "text", preferences: "text",
    avatar_url: "text", points: "int4", created_at: "timestamptz",
    preferred_locale: "text", gift_outcome_learning_enabled: "bool",
    wellbeing_personalization_enabled: "bool",
  },
  people: {
    id: "uuid", user_id: "uuid", name: "text", relationship: "text",
    birthday: "date", notes: "text", created_at: "timestamptz",
    avatar_url: "text", avatar_type: "text", favorite: "bool", archived: "bool",
    color_token: "text", contact_source: "text", sort_order: "int4", phone: "text",
    email: "text", external_contact_id: "text", relation_label: "text",
    relation_category: "text", gender: "text", relation_key: "text",
  },
  events: {
    id: "uuid", user_id: "uuid", title: "text", date: "date", notes: "text",
    created_at: "timestamptz", category: "text", is_important: "bool",
    person_id: "uuid", person_name: "text", recurrence_rule: "text",
    time_of_day: "time", duration_minutes: "int4", location: "text",
    travel_buffer_minutes: "int4",
  },
  memories: {
    id: "uuid", user_id: "uuid", person_id: "uuid", event_id: "uuid",
    content_text: "text", audio_url: "text", transcript_text: "text", images: "_text",
    ai_summary: "text", ai_tags: "_text", ai_emotional_score: "numeric",
    created_at: "timestamptz", updated_at: "timestamptz", type: "text",
    title: "text", value_text: "text", occurred_on: "date", importance: "int2",
    source: "text", is_active: "bool", source_record_id: "text",
    source_excerpt: "text", user_confirmed_at: "timestamptz",
    capture_schema_version: "text", knowledge_reviewed_at: "timestamptz",
    knowledge_review_snoozed_until: "timestamptz",
  },
  subscriptions: {
    id: "uuid", user_id: "uuid", status: "text", plan: "text", source: "text",
    trial_end: "timestamptz", current_period_end: "timestamptz", created_at: "timestamptz",
  },
};

test("clean local rebuild satisfies the minimum runtime core schema contract", { skip: !enabled }, () => {
  const sql = `select table_name, column_name, udt_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name in ('profiles','people','events','memories','subscriptions')
    order by table_name, ordinal_position`;
  const result = spawnSync("docker", [
    "exec", "supabase_db_toto", "psql", "-U", "postgres", "-d", "postgres",
    "-At", "-F", "|", "-c", sql,
  ], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);

  const actual = new Map(result.stdout.trim().split("\n").filter(Boolean).map((line) => {
    const [table, column, type] = line.split("|");
    return [`${table}.${column}`, type];
  }));
  for (const [table, columns] of Object.entries(requiredColumns)) {
    for (const [column, type] of Object.entries(columns)) {
      assert.equal(actual.get(`${table}.${column}`), type, `${table}.${column}`);
    }
  }

  const objectSql = `select object_name from (
    select constraint_name as object_name from information_schema.table_constraints
      where table_schema = 'public' and table_name in ('profiles','people','events','memories','subscriptions')
    union all
    select indexname from pg_indexes
      where schemaname = 'public' and tablename in ('profiles','people','events','memories','subscriptions')
    union all
    select policyname from pg_policies
      where schemaname = 'public' and tablename in ('profiles','people','events','memories','subscriptions')
  ) objects order by object_name`;
  const objectsResult = spawnSync("docker", [
    "exec", "supabase_db_toto", "psql", "-U", "postgres", "-d", "postgres",
    "-At", "-c", objectSql,
  ], { encoding: "utf8" });
  assert.equal(objectsResult.status, 0, objectsResult.stderr || objectsResult.stdout);
  const objects = new Set(objectsResult.stdout.trim().split("\n").filter(Boolean));
  for (const name of [
    "unique_user_subscription", "memories_person_id_fkey", "memories_event_id_fkey",
    "idx_memories_user_person_type", "memories_unique_confirmed_source_record",
    "events_user_person_date_category_uidx", "people_relation_key_idx",
    "profiles_select_own", "people_select_own", "events_select_own",
    "memories_select_own", "subscriptions_select_own",
  ]) assert.ok(objects.has(name), `missing schema object: ${name}`);
});
