# AUDIT-DB-01B — Stored SQL Verification and Staging Rehearsal Plan

**Repository:** `bilohlazova/happydate`  
**Audit base:** `main` at `f4209e79bccc20237c945c043b74841aeec5c148`  
**Scope:** read-only migration-ledger, stored-statement, live-catalog, and repository inspection.

No Supabase project or branch was created. No `db push`, `db reset`, migration repair, DDL, DML, migration-file edit, policy/function/cron/secret/deployment change, or user-data copy was performed.

## 1. Evidence and method

Sources:

- 92 GitHub SQL files under `supabase/migrations` at the audit base.
- Production `yzcvdspiiiaidsdripxr`: read-only `supabase_migrations.schema_migrations` and catalog queries.
- Staging `xgelazzdgluuenqkymox`: the same read-only evidence.
- AUDIT-DB-01 mapping in `docs/audit-db01-migration-reconciliation.md`.

Remote names were normalized using embedded original 14-digit versions where present and, for the three later Production rows, the already-established normalized migration name. Stored arrays were compared with the Git blob using these explicit candidates: direct single-statement content; statement concatenation with `;`, newline, or blank-line delimiters; optional final semicolon/newline restoration; whitespace normalization; and isolated leading-comment comparison.

These are four separate evidence dimensions:

1. **Ledger identity:** normalized version/name mapping.
2. **Stored-SQL content:** byte equality or a documented reconstruction.
3. **Current live object:** catalog/function/index/trigger state now.
4. **Historical execution/effect:** whether the same statements committed in the same order and context.

A stored-text match does **not** prove dimensions 3 or 4. Historical execution/effect remains **UNVERIFIED** for every row.

### Reconciled totals

| Environment | Result |
|---|---|
| Staging | 91 mapped rows: 90 exact Git-blob matches; 1 exact after restoring one final newline (`add_canonical_profile_names`); one remote-only; one local-only |
| Production | 92 mapped rows: 20 direct exact stored-content matches; 39 ending-newline/delimiter reconstructions; 29 whitespace-only after delimiter reconstruction; 3 leading-comments-only; 1 leading-comment plus whitespace |
| Production unresolved stored text | 0 under the documented byte-level methods |
| Production actual SQL-token change detected | 0 |
| Historical execution/effect equivalence | UNVERIFIED for all 92 |

The earlier “20 + 59 + 33” description mixed overlapping candidate methods and therefore was not a valid partition of 92. The table below is the independently recomputed, mutually exclusive partition.

## 2. Production stored-SQL evidence by row

Classification meanings:

- `exact-content`: reconstructed text requires no added delimiter/newline and equals the Git blob.
- `ending-newline`: equality follows only after a final newline or equivalent statement-boundary restoration.
- `whitespace-only`: after restoring statement boundaries, remaining byte differences are whitespace only.
- `leading-comments-only`: the remote statement omits repository header comments; remaining text matches.
- `leading-comment-and-whitespace`: the remote statement omits the header comment and formats the same index statements differently.

Whitespace-only is a textual classification, not a claim that whitespace inside every possible SQL literal is semantically irrelevant. The disposable replay must still compile and test behavior.

| GitHub migration | Production ledger | Stored-SQL classification | Historical execution | Current-schema equivalence |
|---|---|---|---|---|
| `20260401000000_create_core_schema_baseline` | `20260401000000_create_core_schema_baseline` | whitespace-only | UNVERIFIED | Separately assessed; not implied by text match |
| `20260428195349_add_ai_assistant_fields` | `20260428195349_add_ai_assistant_fields` | ending-newline | UNVERIFIED | Separately assessed; not implied by text match |
| `20260507103420_enable_rls_events_and_fix_policies` | `20260507103420_enable_rls_events_and_fix_policies` | ending-newline | UNVERIFIED | Separately assessed; not implied by text match |
| `20260702185057_extend_memories_universal_type_system` | `20260702185057_extend_memories_universal_type_system` | ending-newline | UNVERIFIED | Separately assessed; not implied by text match |
| `20260702185134_fix_set_updated_at_search_path` | `20260702185134_fix_set_updated_at_search_path` | ending-newline | UNVERIFIED | Separately assessed; not implied by text match |
| `20260704084832_rename_people_relation_to_relationship` | `20260704084832_rename_people_relation_to_relationship` | ending-newline | UNVERIFIED | Separately assessed; not implied by text match |
| `20260705143117_add_events_update_policy` | `20260705143117_add_events_update_policy` | ending-newline | UNVERIFIED | Separately assessed; not implied by text match |
| `20260705143928_add_memories_foreign_keys` | `20260705143928_add_memories_foreign_keys` | ending-newline | UNVERIFIED | Separately assessed; not implied by text match |
| `20260705143934_add_with_check_to_memories_update_policy` | `20260705143934_add_with_check_to_memories_update_policy` | ending-newline | UNVERIFIED | Separately assessed; not implied by text match |
| `20260705174428_people_add_ui_profile_fields` | `20260705174428_people_add_ui_profile_fields` | ending-newline | UNVERIFIED | Separately assessed; not implied by text match |
| `20260712112121_add_people_contact_import_columns` | `20260712112121_add_people_contact_import_columns` | ending-newline | UNVERIFIED | Separately assessed; not implied by text match |
| `20260712112214_update_people_contact_source_check_add_card` | `20260712112214_update_people_contact_source_check_add_card` | ending-newline | UNVERIFIED | Separately assessed; not implied by text match |
| `20260712114555_add_people_relation_model_and_gender` | `20260712114555_add_people_relation_model_and_gender` | ending-newline | UNVERIFIED | Separately assessed; not implied by text match |
| `20260712121913_add_people_relation_key` | `20260712121913_add_people_relation_key` | ending-newline | UNVERIFIED | Separately assessed; not implied by text match |
| `20260712122315_make_people_relation_key_idx_partial` | `20260712122315_make_people_relation_key_idx_partial` | ending-newline | UNVERIFIED | Separately assessed; not implied by text match |
| `20260713181333_harden_memory_images_storage_safe_part` | `20260713181333_harden_memory_images_storage_safe_part` | ending-newline | UNVERIFIED | Separately assessed; not implied by text match |
| `20260713183300_make_memory_images_bucket_private` | `20260713183300_make_memory_images_bucket_private` | ending-newline | UNVERIFIED | Separately assessed; not implied by text match |
| `20260716093837_add_preferred_locale_to_profiles` | `20260716093837_add_preferred_locale_to_profiles` | ending-newline | UNVERIFIED | Separately assessed; not implied by text match |
| `20260803181635_harden_core_rls_storage_and_realtime` | `20260803181635_harden_core_rls_storage_and_realtime` | ending-newline | UNVERIFIED | Separately assessed; not implied by text match |
| `20260803184825_create_reminder_lifecycle` | `20260803184825_create_reminder_lifecycle` | exact-content | UNVERIFIED | Separately assessed; not implied by text match |
| `20260803185603_canonical_birthday_event_occurrence` | `20260803185603_canonical_birthday_event_occurrence` | exact-content | UNVERIFIED | Separately assessed; not implied by text match |
| `20260803190256_reminder_preferences_and_delivery_outbox` | `20260803190256_reminder_preferences_and_delivery_outbox` | exact-content | UNVERIFIED | Separately assessed; not implied by text match |
| `20260803190836_activate_reminder_cron_and_in_app_delivery` | `20260803190836_activate_reminder_cron_and_in_app_delivery` | ending-newline | UNVERIFIED | Separately assessed; not implied by text match |
| `20260804154538_create_push_device_registration` | `20260804154538_create_push_device_registration` | whitespace-only | UNVERIFIED | Separately assessed; not implied by text match |
| `20260804161414_add_push_dispatch_claims` | `20260804161414_add_push_dispatch_claims` | ending-newline | UNVERIFIED | Separately assessed; not implied by text match |
| `20260806172231_create_gift_ai_cache_with_memory_invalidation` | `20260806172231_create_gift_ai_cache_with_memory_invalidation` | whitespace-only | UNVERIFIED | Separately assessed; not implied by text match |
| `20260806183837_add_event_recurrence` | `20260806183837_add_event_recurrence` | ending-newline | UNVERIFIED | Separately assessed; not implied by text match |
| `20260806191632_harden_memory_audio_bucket` | `20260806191632_harden_memory_audio_bucket` | ending-newline | UNVERIFIED | Separately assessed; not implied by text match |
| `20260808094421_create_gift_lifecycle_and_saved_links` | `20260808094421_create_gift_lifecycle_and_saved_links` | whitespace-only | UNVERIFIED | Separately assessed; not implied by text match |
| `20260808094459_add_gift_foreign_key_indexes` | `20260808094459_add_gift_foreign_key_indexes` | leading-comment-and-whitespace | UNVERIFIED | Separately assessed; not implied by text match |
| `20260808155759_prevent_duplicate_active_gifts` | `20260808155759_prevent_duplicate_active_gifts` | ending-newline | UNVERIFIED | Separately assessed; not implied by text match |
| `20260808162319_add_gift_link_shortlist_decisions` | `20260808162319_add_gift_link_shortlist_decisions` | whitespace-only | UNVERIFIED | Separately assessed; not implied by text match |
| `20260808162834_snapshot_final_gift_selection` | `20260808162834_snapshot_final_gift_selection` | ending-newline | UNVERIFIED | Separately assessed; not implied by text match |
| `20260808164644_add_confirmed_gift_outcomes` | `20260808164644_add_confirmed_gift_outcomes` | ending-newline | UNVERIFIED | Separately assessed; not implied by text match |
| `20260808165317_add_gift_outcome_learning_preference` | `20260808165317_add_gift_outcome_learning_preference` | whitespace-only | UNVERIFIED | Separately assessed; not implied by text match |
| `20260808171025_add_per_gift_outcome_learning_control` | `20260808171025_add_per_gift_outcome_learning_control` | whitespace-only | UNVERIFIED | Separately assessed; not implied by text match |
| `20260808185020_add_gift_outcome_follow_up_control` | `20260808185020_add_gift_outcome_follow_up_control` | whitespace-only | UNVERIFIED | Separately assessed; not implied by text match |
| `20260809170345_add_memory_brain_provenance` | `20260809170345_add_memory_brain_provenance` | whitespace-only | UNVERIFIED | Separately assessed; not implied by text match |
| `20260810172409_add_memory_knowledge_change_history` | `20260810172409_add_memory_knowledge_change_history` | whitespace-only | UNVERIFIED | Separately assessed; not implied by text match |
| `20260810172946_resolve_memory_knowledge_conflicts_atomically` | `20260810172946_resolve_memory_knowledge_conflicts_atomically` | whitespace-only | UNVERIFIED | Separately assessed; not implied by text match |
| `20260810173459_add_memory_knowledge_review_schedule` | `20260810173459_add_memory_knowledge_review_schedule` | whitespace-only | UNVERIFIED | Separately assessed; not implied by text match |
| `20260810174656_add_knowledge_review_channel_preferences` | `20260810174656_add_knowledge_review_channel_preferences` | whitespace-only | UNVERIFIED | Separately assessed; not implied by text match |
| `20260810175228_add_private_knowledge_review_interactions` | `20260810175228_add_private_knowledge_review_interactions` | whitespace-only | UNVERIFIED | Separately assessed; not implied by text match |
| `20260810175732_retain_knowledge_review_interactions_for_one_year` | `20260810175732_retain_knowledge_review_interactions_for_one_year` | ending-newline | UNVERIFIED | Separately assessed; not implied by text match |
| `20260816113917_harden_authenticated_reminder_rpcs` | `20260816113917_harden_authenticated_reminder_rpcs` | ending-newline | UNVERIFIED | Separately assessed; not implied by text match |
| `20260816115946_restore_secure_onboarding_survey` | `20260816115946_restore_secure_onboarding_survey` | exact-content | UNVERIFIED | Separately assessed; not implied by text match |
| `20260816120306_index_memory_knowledge_changes_person_fk` | `20260816120306_index_memory_knowledge_changes_person_fk` | exact-content | UNVERIFIED | Separately assessed; not implied by text match |
| `20260816142922_add_optional_event_time` | `20260816142922_add_optional_event_time` | ending-newline | UNVERIFIED | Separately assessed; not implied by text match |
| `20260816144837_add_optional_event_duration` | `20260816144837_add_optional_event_duration` | ending-newline | UNVERIFIED | Separately assessed; not implied by text match |
| `20260816145828_create_planner_preferences` | `20260816145828_create_planner_preferences` | ending-newline | UNVERIFIED | Separately assessed; not implied by text match |
| `20260816145907_restrict_planner_preferences_grants` | `20260816145907_restrict_planner_preferences_grants` | ending-newline | UNVERIFIED | Separately assessed; not implied by text match |
| `20260816152306_add_optional_event_location` | `20260816152306_add_optional_event_location` | ending-newline | UNVERIFIED | Separately assessed; not implied by text match |
| `20260816153214_add_optional_event_travel_buffer` | `20260816153214_add_optional_event_travel_buffer` | ending-newline | UNVERIFIED | Separately assessed; not implied by text match |
| `20260823125108_bound_privileged_rpc_payloads` | `20260823125108_bound_privileged_rpc_payloads` | whitespace-only | UNVERIFIED | Separately assessed; not implied by text match |
| `20260823134334_partition_gift_ai_cache_by_locale` | `20260823134334_partition_gift_ai_cache_by_locale` | ending-newline | UNVERIFIED | Separately assessed; not implied by text match |
| `20260829163217_add_user_wellbeing_checkins` | `20260829163217_add_user_wellbeing_checkins` | whitespace-only | UNVERIFIED | Separately assessed; not implied by text match |
| `20260906154551_create_pets_and_person_pets` | `20260906154551_create_pets_and_person_pets` | whitespace-only | UNVERIFIED | Separately assessed; not implied by text match |
| `20260906164111_create_person_symbols` | `20260906164111_create_person_symbols` | whitespace-only | UNVERIFIED | Separately assessed; not implied by text match |
| `20260906170840_add_symbol_meaning_and_interpretation` | `20260906170840_add_symbol_meaning_and_interpretation` | whitespace-only | UNVERIFIED | Separately assessed; not implied by text match |
| `20260907183657_create_person_happy_conversations` | `20260907183657_create_person_happy_conversations` | whitespace-only | UNVERIFIED | Separately assessed; not implied by text match |
| `20260920144944_add_wellbeing_support_moments` | `20260920144944_add_wellbeing_support_moments` | whitespace-only | UNVERIFIED | Separately assessed; not implied by text match |
| `20260921120000_add_gift_event_context_key` | `20260921120000_add_gift_event_context_key` | ending-newline | UNVERIFIED | Separately assessed; not implied by text match |
| `20260923172825_normalize_public_data_api_grants` | `20260923172825_normalize_public_data_api_grants` | whitespace-only | UNVERIFIED | Separately assessed; not implied by text match |
| `20260927093537_create_happy_tasks` | `20260927093537_create_happy_tasks` | whitespace-only | UNVERIFIED | Separately assessed; not implied by text match |
| `20260927094751_create_happy_task_steps` | `20260927094751_create_happy_task_steps` | whitespace-only | UNVERIFIED | Separately assessed; not implied by text match |
| `20260927095351_create_happy_ideas` | `20260927095351_create_happy_ideas` | whitespace-only | UNVERIFIED | Separately assessed; not implied by text match |
| `20260927100223_create_happy_actions` | `20260927100223_create_happy_actions` | whitespace-only | UNVERIFIED | Separately assessed; not implied by text match |
| `20260927101511_create_happy_notifications` | `20260927101511_create_happy_notifications` | ending-newline | UNVERIFIED | Separately assessed; not implied by text match |
| `20260927104526_grant_happy_context_service_role_reads` | `20260927104526_grant_happy_context_service_role_reads` | ending-newline | UNVERIFIED | Separately assessed; not implied by text match |
| `20260927175124_create_birthday_preparation_task_rpc` | `20260927175124_create_birthday_preparation_task_rpc` | whitespace-only | UNVERIFIED | Separately assessed; not implied by text match |
| `20260928080935_add_happy_proactive_birthday_dedupe_and_cron` | `20260928080935_add_happy_proactive_birthday_dedupe_and_cron` | whitespace-only | UNVERIFIED | Separately assessed; not implied by text match |
| `20260928161702_birthday_proactive_intelligence` | `20260928161702_birthday_proactive_intelligence` | whitespace-only | UNVERIFIED | Separately assessed; not implied by text match |
| `20260928163431_add_happy_task_event_person_integrity` | `20260928163431_add_happy_task_event_person_integrity` | ending-newline | UNVERIFIED | Separately assessed; not implied by text match |
| `20261008162935_add_people_birth_year` | `20261008162935_add_people_birth_year` | ending-newline | UNVERIFIED | Separately assessed; not implied by text match |
| `20261009171100_create_happy_task_decisions` | `20261017061227_20261009171100_create_happy_task_decisions` | exact-content | UNVERIFIED | Separately assessed; not implied by text match |
| `20261010130513_grant_happy_action_executor_privileges` | `20261017061228_20261010130513_grant_happy_action_executor_privileges` | exact-content | UNVERIFIED | Separately assessed; not implied by text match |
| `20261011120418_birthday_task_continuation_hardening` | `20261017061229_20261011120418_birthday_task_continuation_hardening` | exact-content | UNVERIFIED | Separately assessed; not implied by text match |
| `20261012173353_birthday_task_gift_recommendations` | `20261017061230_20261012173353_birthday_task_gift_recommendations` | exact-content | UNVERIFIED | Separately assessed; not implied by text match |
| `20261012174029_birthday_task_greetings` | `20261017061231_20261012174029_birthday_task_greetings` | exact-content | UNVERIFIED | Separately assessed; not implied by text match |
| `20261012181028_proactivity_controls_quiet_semantics` | `20261017061232_20261012181028_proactivity_controls_quiet_semantics` | exact-content | UNVERIFIED | Separately assessed; not implied by text match |
| `20261012183422_create_happy_occasion_preferences` | `20261017061233_20261012183422_create_happy_occasion_preferences` | exact-content | UNVERIFIED | Separately assessed; not implied by text match |
| `20261012184303_create_happy_occasion_targets` | `20261017061234_20261012184303_create_happy_occasion_targets` | exact-content | UNVERIFIED | Separately assessed; not implied by text match |
| `20261012190500_grant_happy_action_proposal_insert` | `20261017061235_20261012190500_grant_happy_action_proposal_insert` | exact-content | UNVERIFIED | Separately assessed; not implied by text match |
| `20261013183935_create_happy_occasion_preparations` | `20261017061236_20261013183935_create_happy_occasion_preparations` | exact-content | UNVERIFIED | Separately assessed; not implied by text match |
| `20261015120000_allow_owner_reads_of_proactive_quiet` | `20261017061237_20261015120000_allow_owner_reads_of_proactive_quiet` | exact-content | UNVERIFIED | Separately assessed; not implied by text match |
| `20261015133000_add_generic_occasion_proactive_writer` | `20261017061238_20261015133000_add_generic_occasion_proactive_writer` | exact-content | UNVERIFIED | Separately assessed; not implied by text match |
| `20261015171412_add_happy_occasion_outcomes_and_timing_preferences` | `20261017061239_20261015171412_add_happy_occasion_outcomes_and_timing_preferences` | exact-content | UNVERIFIED | Separately assessed; not implied by text match |
| `20261016175030_grant_happy_proactive_reminder_timezone_read` | `20261017061240_20261016175030_grant_happy_proactive_reminder_timezone_read` | exact-content | UNVERIFIED | Separately assessed; not implied by text match |
| `20261017054630_add_happy_notification_open_state` | `20261017061241_20261017054630_add_happy_notification_open_state` | exact-content | UNVERIFIED | Separately assessed; not implied by text match |
| `20261017105726_add_canonical_profile_names` | `20261020160320_add_canonical_profile_names` | leading-comments-only | UNVERIFIED | Separately assessed; not implied by text match |
| `20261017112945_sync_profile_names_from_auth_metadata` | `20261020160328_sync_profile_names_from_auth_metadata` | leading-comments-only | UNVERIFIED | Separately assessed; not implied by text match |
| `20261020153546_preserve_legacy_survey_events` | `20261020160329_preserve_legacy_survey_events` | leading-comments-only | UNVERIFIED | Separately assessed; not implied by text match |

### Difference detail

| Class | Count | Risk | Interpretation |
|---|---:|---|---|
| Direct exact stored content | 20 | Low for provenance; historical effect still unknown | Stored text equals Git content directly. |
| Statement delimiter / final newline | 39 | Low | Ledger storage split or terminal-newline representation explains the byte difference. |
| Whitespace-only after delimiter restoration | 29 | Low–medium | No non-whitespace byte difference was detected; replay remains required. |
| Leading comments only | 3 | Low | Production omits repository-only header comments for the two profile-name migrations and survey preservation migration. |
| Leading comment plus whitespace | 1 | Low | `add_gift_foreign_key_indexes` omits its header comment and reformats the same three index statements. |
| Actual SQL text change | 0 | — | None detected by these methods. |
| Unresolved | 0 | — | None remain at stored-text level. |

## 3. Staging-only onboarding migration and missing survey migration

Staging-only `20261017105002_harden_onboarding_completion_idempotency` contains:

- comments documenting `completed_at` and `reward_granted_at`;
- a one-time backfill of completed survey rows;
- partial index `user_survey_completed_idx`;
- advisory-lock and row-lock based one-time reward protection;
- a replacement of `save_my_onboarding_survey`;
- deletion of every previously referenced event before inserting replacement events when `p_special_dates` is supplied.

GitHub/Production-only `20261020153546_preserve_legacy_survey_events` contains:

- `events.survey_origin`;
- explicit `onboarding_survey` provenance for newly created survey events;
- positional update only when the referenced row is owned by the caller and has trusted survey provenance;
- preservation of legacy or user-created events instead of deleting them;
- the same advisory-lock, validation, one-time reward, and completion-marker concepts.

### Overlap and interaction

Both migrations replace the same RPC and preserve the same idempotent reward/completion core. They are not additive alternatives. Applying the local survey migration after the Staging-only migration would intentionally supersede the destructive event replacement behavior while leaving the Staging-only comments, backfilled markers, and partial index in place. Blindly replaying either historical migration is unsafe because the Staging-only migration contains DML and because execution order determines which RPC body wins.

Confirmed current state:

| Target | Production | Staging | Intended canonical target for rehearsal |
|---|---|---|---|
| `events.survey_origin` | Present | Absent | Present; nullable; only trusted survey-created rows receive `onboarding_survey` |
| Survey RPC | Provenance-aware preservation | Deletes referenced events before replacement | Provenance-aware preservation from the reviewed GitHub migration |
| Completion/reward markers | Used by RPC | Used and historically backfilled | Retain idempotent markers; no blind historical backfill |
| `user_survey_completed_idx` | Absent | Present | Retain only after `EXPLAIN`/catalog review confirms value and name/definition are canonical |
| `expire_trials()` | Implemented update of expired trials | No-op | Production behavior is the functional candidate, but its authoritative migration provenance is missing and must be captured in a new additive migration before rehearsal |
| `rls_auto_enable()` / `ensure_rls` | Functional security-definer function plus enabled `ddl_command_end` trigger | No-op function; trigger absent | Production behavior is the security candidate; exact reviewed source, ownership, grants, and failure policy must be canonicalized before rehearsal |

The target above is an audit recommendation, not authorization to change either environment. The `expire_trials` and automatic-RLS implementations are live Production evidence but are not reproduced by the current 92 GitHub migrations; their origin and desired long-term behavior therefore require owner approval and security review.

## 4. Trustworthy history strategy

Do not rewrite old files, rename ledger versions, insert/delete ledger rows, or replay old migrations merely to make the CLI green.

The trustworthy path is:

1. Archive immutable evidence: Git commit, both ledgers, stored statements/hashes, catalog definitions, grants, owners, triggers, indexes, policies, RLS flags, extensions, and schedules.
2. Declare the existing remote ledgers historical facts, including renumbered rows and the Staging-only row.
3. Define a canonical **forward state** with reviewed object definitions.
4. Add future, idempotent, additive corrective migration(s) with new versions. Each must inspect/alter only the intended objects and must not depend on falsifying old ledger versions.
5. Validate those migrations from a clean Git replay and against a synthetic clone of the observed Staging shape.
6. Preserve a machine-readable reconciliation manifest mapping canonical Git migration identity to each remote historical identity. The manifest is evidence, not executable SQL and not a ledger mutation.
7. Re-run the three-way audit after every rehearsal and real Staging change.

If Supabase tooling still rejects remote-only versions, stop. Obtain provider guidance for a supported history-baseline mechanism; do not use `migration repair` until the exact consequences are reviewed and explicitly approved.

## 5. Disposable rehearsal design

Supabase branches are isolated and data-less by default. They have separate credentials and usage charges; current documentation notes that branch usage counts toward plan quota and is not covered by Spend Cap. See [Supabase Branching](https://supabase.com/docs/guides/deployment/branching), [Working with branches](https://supabase.com/docs/guides/deployment/branching/working-with-branches), and [Branching usage](https://supabase.com/docs/guides/platform/manage-your-usage/branching).

### Approval gates

1. **Design approval:** owner approves canonical definitions and this plan.
2. **Cost approval:** obtain a current branch/project cost quote; owner explicitly accepts it.
3. **Evidence approval:** snapshots and hashes are archived without user data.
4. **Execution approval:** owner authorizes creating the disposable environment.
5. **Staging proposal approval:** only after disposable pass; separate PR and change window.
6. **Production approval:** outside AUDIT-DB-01B and not implied.

### Environment construction

Use a new ephemeral branch/project with no Production data. Seed only synthetic users and synthetic survey/events/subscriptions. Exercise two paths:

- **Clean replay:** all canonical Git migrations plus future forward-correction candidates.
- **Observed-Staging fixture:** reproduce only the verified schema/function/index/ledger-relevant shape needed to test correction behavior. Never copy Staging/Production rows.

Record engine/extensions/configuration differences. Pin the commit and CLI version. Batch no unrelated runtime deployment.

### Exact test matrix

| Area | Synthetic setup and action | PASS | FAIL |
|---|---|---|---|
| Clean migration replay | Empty disposable DB; apply canonical sequence | Every migration commits; no history mismatch | Any migration, dependency, or Preview validation error |
| Survey first completion | New synthetic user submits survey twice/concurrently | One reward; stable completion markers | Duplicate reward or marker regression |
| Legacy events | Existing referenced event with NULL provenance; submit changed dates | Legacy row remains; new trusted row is marked | Legacy/user row deleted or relabelled |
| Trusted survey event | Existing owner event with `onboarding_survey`; update | Same row updated when valid | Duplicate, cross-owner update, or deletion |
| Cross-account isolation | User B references User A event IDs | No read/update/delete leakage | Any cross-owner effect |
| NULL special dates | Existing survey references; call with NULL | References and rows preserved | Mutation/deletion |
| Concurrent survey calls | Two sessions, same user | Serialized one-time reward; deterministic references | Duplicate reward or lost update |
| Survey index | Representative synthetic completed/incomplete rows; catalog and `EXPLAIN` | Correct predicate; no write failure; justified use | Wrong predicate/name or harmful plan |
| Trial expiry | Trial before/after cutoff plus non-trial rows | Only elapsed trials become expired | No-op or incorrect row changes |
| Automatic RLS | Create disposable public test table, then inspect and drop within disposable rehearsal only | RLS automatically enabled; system schemas skipped | RLS disabled, privilege escalation, or trigger aborts unrelated DDL |
| Grants/ownership | Inspect RPC/functions/event trigger | Exact approved owner, `search_path`, execute grants | PUBLIC/anon/authenticated exposure or unsafe owner |
| Existing policies | Compare canonical policy hashes and owner tests | No policy drift | Any lost/expanded access |
| Failure injection | Abort correction transaction before commit | No partial object/data state | Partial persistence |
| Re-run idempotency | Run forward correction a second time in disposable only | No duplicate object/data change | Duplicate index/trigger/data mutation |
| App contract | Web, Android, iOS synthetic onboarding flows | Same API shape and expected behavior | Client breakage |

### Recovery and rollback rehearsal

Before each candidate run, preserve disposable schema/ledger hashes and a provider snapshot if available. Inject a transaction failure and prove rollback. Prefer a forward corrective migration; prepare a reviewed inverse only for newly introduced objects. Deleting/recreating the disposable environment is acceptable only after evidence capture and owner approval. Staging rollback must use a verified provider restore point or reviewed forward/inverse migration—not ledger edits.

### Pass/fail gate

PASS requires all matrix rows, exact catalog hashes for approved objects, no owner-isolation regression, no user-visible event loss, repeatable clean replay, repeatable correction, and zero unresolved migration-tool errors. Any mismatch is a hard stop; revise the candidate and repeat in a fresh disposable environment.

## 6. Smallest future Staging proposal

Not executable in this audit:

1. One documentation/evidence PR finalizes canonical SQL for survey preservation, the optional survey index, `expire_trials`, and automatic RLS.
2. One migration PR adds a new forward-only, idempotent correction for the survey column/RPC and explicitly retains or replaces the existing index after review. It must not rerun the Staging-only DML backfill.
3. Separate migration PR(s) handle `expire_trials` and automatic RLS because their security and operational risks are independent.
4. Run each candidate in a fresh disposable environment, then obtain explicit authorization for Staging.
5. Re-audit Staging before any AUDIT-03C-2B migration.

Combining survey behavior, trial expiry, and event-trigger hardening into one migration is rejected: it increases rollback scope and obscures failures.

## 7. Risks and readiness for AUDIT-03C-2B

| Risk | Level | Required control |
|---|---|---|
| Replaying Staging-only survey DML | High | Never replay; forward-only correction |
| Deleting legacy/user events | High | Provenance-aware tests and owner isolation |
| Automatic event trigger | High | Separate security review and disposable DDL tests |
| Missing provenance for Production-only function bodies | High | Canonical reviewed migration source |
| Ledger rewrite/repair | High | Prohibited without separate provider-backed decision |
| Whitespace/delimiter reconstruction | Low–medium | Clean compile plus behavior tests |
| Disposable branch cost | Medium | Current quote and explicit owner approval |

AUDIT-03C-2B may proceed only after:

- this document and canonical targets are approved;
- exact source and security review exist for `expire_trials` and `rls_auto_enable`/`ensure_rls`;
- survey index disposition is approved;
- the disposable cost and creation are separately authorized;
- the complete test matrix passes twice, including a fresh rebuild;
- recovery/rollback is demonstrated;
- Staging change PRs are small, forward-only, and independently reversible;
- the post-rehearsal three-way mapping and live-object comparison have no unexplained drift;
- the owner explicitly approves the first Staging change.

## Status

**Documentation-only proposal.** Production, Staging, migration history, runtime, policies, functions, cron, secrets, and deployments remain unchanged.

