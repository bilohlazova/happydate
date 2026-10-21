# AUDIT-DB-01 — Three-Way Migration Reconciliation

**Repository:** `bilohlazova/happydate`  
**Audit base:** `origin/main` `c2db87e425856458478efdc4f1f1c63bb9bdda40`  
**Scope:** read-only GitHub and Supabase metadata/schema inspection.

No `db push`, `db reset`, migration repair, DDL/DML, history rename/delete, RLS/cron/function/secret/settings change, or Production-data copy was performed.

## Evidence summary

| Source | Result |
|---|---|
| GitHub `supabase/migrations` | 92 SQL files |
| Production `yzcvdspiiiaidsdripxr` | 92 migration rows; PostgreSQL 17.6.1.063; ACTIVE_HEALTHY |
| Staging `xgelazzdgluuenqkymox` | 92 migration rows; PostgreSQL 17.11.0.003; ACTIVE_HEALTHY |

Production has 74 exact version/name matches and 18 name matches with renumbered versions. Staging has 91 normalized-name matches, one local-only name and one remote-only name; all mapped Staging versions are renumbered and execution order differs.

**Important:** equal filename/name is not equal applied SQL. The migration ledger exposes version/name, not the historical SQL statement. Per-migration SQL equivalence is therefore **UNVERIFIED** below. Current stored object definitions are compared separately.

## Classification

- **PROD exact:** GitHub version and name equal Production ledger.
- **PROD version-renumbered:** name matches, version differs.
- **STG version-renumbered/name-match:** normalized name matches, version differs.
- **STG missing:** no normalized-name Staging row.
- **SQL equivalence:** **UNVERIFIED** unless a current live object comparison proves only that object, not the migration history.

## Complete three-way mapping

| # | GitHub filename/version | Production version/name | Staging version/name | Classification | SQL equivalence | Risk |
|---:|---|---|---|---|---|---|
| 1 | `20260401000000_create_core_schema_baseline` | `20260401000000_create_core_schema_baseline` | `20261017072720_20260401000000_create_core_schema_baseline` | PROD exact; STG version-renumbered/name-match (order 1) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 2 | `20260428195349_add_ai_assistant_fields` | `20260428195349_add_ai_assistant_fields` | `20261017072722_20260428195349_add_ai_assistant_fields` | PROD exact; STG version-renumbered/name-match (order 2) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 3 | `20260507103420_enable_rls_events_and_fix_policies` | `20260507103420_enable_rls_events_and_fix_policies` | `20261017072726_20260507103420_enable_rls_events_and_fix_policies` | PROD exact; STG version-renumbered/name-match (order 3) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 4 | `20260702185057_extend_memories_universal_type_system` | `20260702185057_extend_memories_universal_type_system` | `20261017072729_20260702185057_extend_memories_universal_type_system` | PROD exact; STG version-renumbered/name-match (order 4) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 5 | `20260702185134_fix_set_updated_at_search_path` | `20260702185134_fix_set_updated_at_search_path` | `20261017072730_20260702185134_fix_set_updated_at_search_path` | PROD exact; STG version-renumbered/name-match (order 5) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 6 | `20260704084832_rename_people_relation_to_relationship` | `20260704084832_rename_people_relation_to_relationship` | `20261017072731_20260704084832_rename_people_relation_to_relationship` | PROD exact; STG version-renumbered/name-match (order 6) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 7 | `20260705143117_add_events_update_policy` | `20260705143117_add_events_update_policy` | `20261017072732_20260705143117_add_events_update_policy` | PROD exact; STG version-renumbered/name-match (order 7) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 8 | `20260705143928_add_memories_foreign_keys` | `20260705143928_add_memories_foreign_keys` | `20261017072733_20260705143928_add_memories_foreign_keys` | PROD exact; STG version-renumbered/name-match (order 8) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 9 | `20260705143934_add_with_check_to_memories_update_policy` | `20260705143934_add_with_check_to_memories_update_policy` | `20261017072736_20260705143934_add_with_check_to_memories_update_policy` | PROD exact; STG version-renumbered/name-match (order 9) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 10 | `20260705174428_people_add_ui_profile_fields` | `20260705174428_people_add_ui_profile_fields` | `20261017072737_20260705174428_people_add_ui_profile_fields` | PROD exact; STG version-renumbered/name-match (order 10) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 11 | `20260712112121_add_people_contact_import_columns` | `20260712112121_add_people_contact_import_columns` | `20261017072740_20260712112121_add_people_contact_import_columns` | PROD exact; STG version-renumbered/name-match (order 11) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 12 | `20260712112214_update_people_contact_source_check_add_card` | `20260712112214_update_people_contact_source_check_add_card` | `20261017072741_20260712112214_update_people_contact_source_check_add_card` | PROD exact; STG version-renumbered/name-match (order 12) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 13 | `20260712114555_add_people_relation_model_and_gender` | `20260712114555_add_people_relation_model_and_gender` | `20261017072743_20260712114555_add_people_relation_model_and_gender` | PROD exact; STG version-renumbered/name-match (order 13) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 14 | `20260712121913_add_people_relation_key` | `20260712121913_add_people_relation_key` | `20261017072744_20260712121913_add_people_relation_key` | PROD exact; STG version-renumbered/name-match (order 14) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 15 | `20260712122315_make_people_relation_key_idx_partial` | `20260712122315_make_people_relation_key_idx_partial` | `20261017072747_20260712122315_make_people_relation_key_idx_partial` | PROD exact; STG version-renumbered/name-match (order 15) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 16 | `20260713181333_harden_memory_images_storage_safe_part` | `20260713181333_harden_memory_images_storage_safe_part` | `20261017072750_20260713181333_harden_memory_images_storage_safe_part` | PROD exact; STG version-renumbered/name-match (order 16) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 17 | `20260713183300_make_memory_images_bucket_private` | `20260713183300_make_memory_images_bucket_private` | `20261017072751_20260713183300_make_memory_images_bucket_private` | PROD exact; STG version-renumbered/name-match (order 17) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 18 | `20260716093837_add_preferred_locale_to_profiles` | `20260716093837_add_preferred_locale_to_profiles` | `20261017072752_20260716093837_add_preferred_locale_to_profiles` | PROD exact; STG version-renumbered/name-match (order 18) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 19 | `20260803181635_harden_core_rls_storage_and_realtime` | `20260803181635_harden_core_rls_storage_and_realtime` | `20261017072757_20260803181635_harden_core_rls_storage_and_realtime` | PROD exact; STG version-renumbered/name-match (order 19) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 20 | `20260803184825_create_reminder_lifecycle` | `20260803184825_create_reminder_lifecycle` | `20261017072758_20260803184825_create_reminder_lifecycle` | PROD exact; STG version-renumbered/name-match (order 20) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 21 | `20260803185603_canonical_birthday_event_occurrence` | `20260803185603_canonical_birthday_event_occurrence` | `20261017072759_20260803185603_canonical_birthday_event_occurrence` | PROD exact; STG version-renumbered/name-match (order 21) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 22 | `20260803190256_reminder_preferences_and_delivery_outbox` | `20260803190256_reminder_preferences_and_delivery_outbox` | `20261017072800_20260803190256_reminder_preferences_and_delivery_outbox` | PROD exact; STG version-renumbered/name-match (order 22) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 23 | `20260803190836_activate_reminder_cron_and_in_app_delivery` | `20260803190836_activate_reminder_cron_and_in_app_delivery` | `20261017072802_20260803190836_activate_reminder_cron_and_in_app_delivery` | PROD exact; STG version-renumbered/name-match (order 23) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 24 | `20260804154538_create_push_device_registration` | `20260804154538_create_push_device_registration` | `20261017072803_20260804154538_create_push_device_registration` | PROD exact; STG version-renumbered/name-match (order 24) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 25 | `20260804161414_add_push_dispatch_claims` | `20260804161414_add_push_dispatch_claims` | `20261017072804_20260804161414_add_push_dispatch_claims` | PROD exact; STG version-renumbered/name-match (order 25) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 26 | `20260806172231_create_gift_ai_cache_with_memory_invalidation` | `20260806172231_create_gift_ai_cache_with_memory_invalidation` | `20261017072806_20260806172231_create_gift_ai_cache_with_memory_invalidation` | PROD exact; STG version-renumbered/name-match (order 26) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 27 | `20260806183837_add_event_recurrence` | `20260806183837_add_event_recurrence` | `20261017072807_20260806183837_add_event_recurrence` | PROD exact; STG version-renumbered/name-match (order 27) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 28 | `20260806191632_harden_memory_audio_bucket` | `20260806191632_harden_memory_audio_bucket` | `20261017072808_20260806191632_harden_memory_audio_bucket` | PROD exact; STG version-renumbered/name-match (order 28) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 29 | `20260808094421_create_gift_lifecycle_and_saved_links` | `20260808094421_create_gift_lifecycle_and_saved_links` | `20261017072809_20260808094421_create_gift_lifecycle_and_saved_links` | PROD exact; STG version-renumbered/name-match (order 29) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 30 | `20260808094459_add_gift_foreign_key_indexes` | `20260808094459_add_gift_foreign_key_indexes` | `20261017072810_20260808094459_add_gift_foreign_key_indexes` | PROD exact; STG version-renumbered/name-match (order 30) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 31 | `20260808155759_prevent_duplicate_active_gifts` | `20260808155759_prevent_duplicate_active_gifts` | `20261017072816_20260808155759_prevent_duplicate_active_gifts` | PROD exact; STG version-renumbered/name-match (order 31) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 32 | `20260808162319_add_gift_link_shortlist_decisions` | `20260808162319_add_gift_link_shortlist_decisions` | `20261017072817_20260808162319_add_gift_link_shortlist_decisions` | PROD exact; STG version-renumbered/name-match (order 32) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 33 | `20260808162834_snapshot_final_gift_selection` | `20260808162834_snapshot_final_gift_selection` | `20261017072818_20260808162834_snapshot_final_gift_selection` | PROD exact; STG version-renumbered/name-match (order 33) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 34 | `20260808164644_add_confirmed_gift_outcomes` | `20260808164644_add_confirmed_gift_outcomes` | `20261017072819_20260808164644_add_confirmed_gift_outcomes` | PROD exact; STG version-renumbered/name-match (order 34) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 35 | `20260808165317_add_gift_outcome_learning_preference` | `20260808165317_add_gift_outcome_learning_preference` | `20261017072821_20260808165317_add_gift_outcome_learning_preference` | PROD exact; STG version-renumbered/name-match (order 35) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 36 | `20260808171025_add_per_gift_outcome_learning_control` | `20260808171025_add_per_gift_outcome_learning_control` | `20261017072854_20260808171025_add_per_gift_outcome_learning_control` | PROD exact; STG version-renumbered/name-match (order 36) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 37 | `20260808185020_add_gift_outcome_follow_up_control` | `20260808185020_add_gift_outcome_follow_up_control` | `20261017072857_20260808185020_add_gift_outcome_follow_up_control` | PROD exact; STG version-renumbered/name-match (order 37) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 38 | `20260809170345_add_memory_brain_provenance` | `20260809170345_add_memory_brain_provenance` | `20261017072858_20260809170345_add_memory_brain_provenance` | PROD exact; STG version-renumbered/name-match (order 38) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 39 | `20260810172409_add_memory_knowledge_change_history` | `20260810172409_add_memory_knowledge_change_history` | `20261017072859_20260810172409_add_memory_knowledge_change_history` | PROD exact; STG version-renumbered/name-match (order 39) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 40 | `20260810172946_resolve_memory_knowledge_conflicts_atomically` | `20260810172946_resolve_memory_knowledge_conflicts_atomically` | `20261017072900_20260810172946_resolve_memory_knowledge_conflicts_atomically` | PROD exact; STG version-renumbered/name-match (order 40) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 41 | `20260810173459_add_memory_knowledge_review_schedule` | `20260810173459_add_memory_knowledge_review_schedule` | `20261017072901_20260810173459_add_memory_knowledge_review_schedule` | PROD exact; STG version-renumbered/name-match (order 41) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 42 | `20260810174656_add_knowledge_review_channel_preferences` | `20260810174656_add_knowledge_review_channel_preferences` | `20261017072902_20260810174656_add_knowledge_review_channel_preferences` | PROD exact; STG version-renumbered/name-match (order 42) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 43 | `20260810175228_add_private_knowledge_review_interactions` | `20260810175228_add_private_knowledge_review_interactions` | `20261017072903_20260810175228_add_private_knowledge_review_interactions` | PROD exact; STG version-renumbered/name-match (order 43) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 44 | `20260810175732_retain_knowledge_review_interactions_for_one_year` | `20260810175732_retain_knowledge_review_interactions_for_one_year` | `20261017072904_20260810175732_retain_knowledge_review_interactions_for_one_year` | PROD exact; STG version-renumbered/name-match (order 44) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 45 | `20260816113917_harden_authenticated_reminder_rpcs` | `20260816113917_harden_authenticated_reminder_rpcs` | `20261017072905_20260816113917_harden_authenticated_reminder_rpcs` | PROD exact; STG version-renumbered/name-match (order 45) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 46 | `20260816115946_restore_secure_onboarding_survey` | `20260816115946_restore_secure_onboarding_survey` | `20261017072909_20260816115946_restore_secure_onboarding_survey` | PROD exact; STG version-renumbered/name-match (order 46) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 47 | `20260816120306_index_memory_knowledge_changes_person_fk` | `20260816120306_index_memory_knowledge_changes_person_fk` | `20261017072910_20260816120306_index_memory_knowledge_changes_person_fk` | PROD exact; STG version-renumbered/name-match (order 47) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 48 | `20260816142922_add_optional_event_time` | `20260816142922_add_optional_event_time` | `20261017072912_20260816142922_add_optional_event_time` | PROD exact; STG version-renumbered/name-match (order 48) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 49 | `20260816144837_add_optional_event_duration` | `20260816144837_add_optional_event_duration` | `20261017072913_20260816144837_add_optional_event_duration` | PROD exact; STG version-renumbered/name-match (order 49) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 50 | `20260816145828_create_planner_preferences` | `20260816145828_create_planner_preferences` | `20261017072916_20260816145828_create_planner_preferences` | PROD exact; STG version-renumbered/name-match (order 50) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 51 | `20260816145907_restrict_planner_preferences_grants` | `20260816145907_restrict_planner_preferences_grants` | `20261017072920_20260816145907_restrict_planner_preferences_grants` | PROD exact; STG version-renumbered/name-match (order 51) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 52 | `20260816152306_add_optional_event_location` | `20260816152306_add_optional_event_location` | `20261017072921_20260816152306_add_optional_event_location` | PROD exact; STG version-renumbered/name-match (order 52) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 53 | `20260816153214_add_optional_event_travel_buffer` | `20260816153214_add_optional_event_travel_buffer` | `20261017072922_20260816153214_add_optional_event_travel_buffer` | PROD exact; STG version-renumbered/name-match (order 53) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 54 | `20260823125108_bound_privileged_rpc_payloads` | `20260823125108_bound_privileged_rpc_payloads` | `20261017072923_20260823125108_bound_privileged_rpc_payloads` | PROD exact; STG version-renumbered/name-match (order 54) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 55 | `20260823134334_partition_gift_ai_cache_by_locale` | `20260823134334_partition_gift_ai_cache_by_locale` | `20261017072924_20260823134334_partition_gift_ai_cache_by_locale` | PROD exact; STG version-renumbered/name-match (order 55) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 56 | `20260829163217_add_user_wellbeing_checkins` | `20260829163217_add_user_wellbeing_checkins` | `20261017072925_20260829163217_add_user_wellbeing_checkins` | PROD exact; STG version-renumbered/name-match (order 56) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 57 | `20260906154551_create_pets_and_person_pets` | `20260906154551_create_pets_and_person_pets` | `20261017072926_20260906154551_create_pets_and_person_pets` | PROD exact; STG version-renumbered/name-match (order 57) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 58 | `20260906164111_create_person_symbols` | `20260906164111_create_person_symbols` | `20261017072927_20260906164111_create_person_symbols` | PROD exact; STG version-renumbered/name-match (order 58) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 59 | `20260906170840_add_symbol_meaning_and_interpretation` | `20260906170840_add_symbol_meaning_and_interpretation` | `20261017072928_20260906170840_add_symbol_meaning_and_interpretation` | PROD exact; STG version-renumbered/name-match (order 59) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 60 | `20260907183657_create_person_happy_conversations` | `20260907183657_create_person_happy_conversations` | `20261017072929_20260907183657_create_person_happy_conversations` | PROD exact; STG version-renumbered/name-match (order 60) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 61 | `20260920144944_add_wellbeing_support_moments` | `20260920144944_add_wellbeing_support_moments` | `20261017072930_20260920144944_add_wellbeing_support_moments` | PROD exact; STG version-renumbered/name-match (order 61) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 62 | `20260921120000_add_gift_event_context_key` | `20260921120000_add_gift_event_context_key` | `20261017073449_20260921120000_add_gift_event_context_key` | PROD exact; STG version-renumbered/name-match (order 70) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 63 | `20260923172825_normalize_public_data_api_grants` | `20260923172825_normalize_public_data_api_grants` | `20261017073435_20260923172825_normalize_public_data_api_grants` | PROD exact; STG version-renumbered/name-match (order 62) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 64 | `20260927093537_create_happy_tasks` | `20260927093537_create_happy_tasks` | `20261017073436_20260927093537_create_happy_tasks` | PROD exact; STG version-renumbered/name-match (order 63) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 65 | `20260927094751_create_happy_task_steps` | `20260927094751_create_happy_task_steps` | `20261017073437_20260927094751_create_happy_task_steps` | PROD exact; STG version-renumbered/name-match (order 64) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 66 | `20260927095351_create_happy_ideas` | `20260927095351_create_happy_ideas` | `20261017073438_20260927095351_create_happy_ideas` | PROD exact; STG version-renumbered/name-match (order 65) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 67 | `20260927100223_create_happy_actions` | `20260927100223_create_happy_actions` | `20261017073439_20260927100223_create_happy_actions` | PROD exact; STG version-renumbered/name-match (order 66) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 68 | `20260927101511_create_happy_notifications` | `20260927101511_create_happy_notifications` | `20261017073440_20260927101511_create_happy_notifications` | PROD exact; STG version-renumbered/name-match (order 67) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 69 | `20260927104526_grant_happy_context_service_role_reads` | `20260927104526_grant_happy_context_service_role_reads` | `20261017073442_20260927104526_grant_happy_context_service_role_reads` | PROD exact; STG version-renumbered/name-match (order 68) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 70 | `20260927175124_create_birthday_preparation_task_rpc` | `20260927175124_create_birthday_preparation_task_rpc` | `20261017073443_20260927175124_create_birthday_preparation_task_rpc` | PROD exact; STG version-renumbered/name-match (order 69) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 71 | `20260928080935_add_happy_proactive_birthday_dedupe_and_cron` | `20260928080935_add_happy_proactive_birthday_dedupe_and_cron` | `20261017073452_20260928080935_add_happy_proactive_birthday_dedupe_and_cron` | PROD exact; STG version-renumbered/name-match (order 71) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 72 | `20260928161702_birthday_proactive_intelligence` | `20260928161702_birthday_proactive_intelligence` | `20261017073454_20260928161702_birthday_proactive_intelligence` | PROD exact; STG version-renumbered/name-match (order 72) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 73 | `20260928163431_add_happy_task_event_person_integrity` | `20260928163431_add_happy_task_event_person_integrity` | `20261017073455_20260928163431_add_happy_task_event_person_integrity` | PROD exact; STG version-renumbered/name-match (order 73) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 74 | `20261008162935_add_people_birth_year` | `20261008162935_add_people_birth_year` | `20261017073456_20261008162935_add_people_birth_year` | PROD exact; STG version-renumbered/name-match (order 74) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 75 | `20261009171100_create_happy_task_decisions` | — | `20261017073519_20261009171100_create_happy_task_decisions` | PROD missing; STG version-renumbered/name-match (order 87) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 76 | `20261010130513_grant_happy_action_executor_privileges` | — | `20261017073458_20261010130513_grant_happy_action_executor_privileges` | PROD missing; STG version-renumbered/name-match (order 75) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 77 | `20261011120418_birthday_task_continuation_hardening` | — | `20261017073459_20261011120418_birthday_task_continuation_hardening` | PROD missing; STG version-renumbered/name-match (order 76) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 78 | `20261012173353_birthday_task_gift_recommendations` | — | `20261017073521_20261012173353_birthday_task_gift_recommendations` | PROD missing; STG version-renumbered/name-match (order 88) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 79 | `20261012174029_birthday_task_greetings` | — | `20261017073501_20261012174029_birthday_task_greetings` | PROD missing; STG version-renumbered/name-match (order 77) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 80 | `20261012181028_proactivity_controls_quiet_semantics` | — | `20261017073502_20261012181028_proactivity_controls_quiet_semantics` | PROD missing; STG version-renumbered/name-match (order 78) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 81 | `20261012183422_create_happy_occasion_preferences` | — | `20261017073503_20261012183422_create_happy_occasion_preferences` | PROD missing; STG version-renumbered/name-match (order 79) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 82 | `20261012184303_create_happy_occasion_targets` | — | `20261017073504_20261012184303_create_happy_occasion_targets` | PROD missing; STG version-renumbered/name-match (order 80) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 83 | `20261012190500_grant_happy_action_proposal_insert` | — | `20261017073505_20261012190500_grant_happy_action_proposal_insert` | PROD missing; STG version-renumbered/name-match (order 81) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 84 | `20261013183935_create_happy_occasion_preparations` | — | `20261017073506_20261013183935_create_happy_occasion_preparations` | PROD missing; STG version-renumbered/name-match (order 82) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 85 | `20261015120000_allow_owner_reads_of_proactive_quiet` | — | `20261017073507_20261015120000_allow_owner_reads_of_proactive_quiet` | PROD missing; STG version-renumbered/name-match (order 83) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 86 | `20261015133000_add_generic_occasion_proactive_writer` | — | `20261017073508_20261015133000_add_generic_occasion_proactive_writer` | PROD missing; STG version-renumbered/name-match (order 84) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 87 | `20261015171412_add_happy_occasion_outcomes_and_timing_preferences` | — | `20261017073509_20261015171412_add_happy_occasion_outcomes_and_timing_preferences` | PROD missing; STG version-renumbered/name-match (order 85) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 88 | `20261016175030_grant_happy_proactive_reminder_timezone_read` | — | `20261017073524_20261016175030_grant_happy_proactive_reminder_timezone_read` | PROD missing; STG version-renumbered/name-match (order 89) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 89 | `20261017054630_add_happy_notification_open_state` | — | `20261017073511_20261017054630_add_happy_notification_open_state` | PROD missing; STG version-renumbered/name-match (order 86) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 90 | `20261017105726_add_canonical_profile_names` | `20261020160320_add_canonical_profile_names` | `20261017105759_add_canonical_profile_names` | PROD version-renumbered; STG version-renumbered/name-match (order 91) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 91 | `20261017112945_sync_profile_names_from_auth_metadata` | `20261020160328_sync_profile_names_from_auth_metadata` | `20261017113501_sync_profile_names_from_auth_metadata` | PROD version-renumbered; STG version-renumbered/name-match (order 92) | UNVERIFIED — ledger has no SQL text | order differs from GitHub sequence |
| 92 | `20261020153546_preserve_legacy_survey_events` | `20261020160329_preserve_legacy_survey_events` | — | PROD version-renumbered; STG missing | UNVERIFIED — ledger has no SQL text | unmapped Staging counterpart |

### Set differences

| Set | Entry |
|---|---|
| Staging remote-only | `20261017105002_harden_onboarding_completion_idempotency` |
| GitHub/Production local-only | `20261020153546_preserve_legacy_survey_events` |

The equal count of 92 does not mean equal sets.

## Order and migration-history findings

Production retains the normalized GitHub name set but renumbers 18 remote versions. Staging uses a generated 2026-10-17 execution namespace and reorders groups, including the happy-task/proactive and gift-event groups. A name match does not establish dependency order.

The Staging-only onboarding hardening SQL and the historical reason it was created outside the GitHub set are **UNVERIFIED** from read-only metadata. The GitHub local-only survey migration is absent from Staging and its historical omission reason is also **UNVERIFIED**.

Supabase Preview reports “Remote migration versions not found in local migrations directory” because Staging versions such as `20261017072720` are not local filename versions such as `20260401000000`; the embedded original filename does not make the version identifier local. The remote-only name also has no local file.

## Live schema differences

### Onboarding and survey events

| Object | Production | Staging | Impact |
|---|---|---|---|
| `public.events.survey_origin` | Present, nullable text | Absent | Production can mark onboarding-origin events; Staging cannot persist this marker. |
| `save_my_onboarding_survey(...)` | Definition MD5 `dfaff7c3494447cf64a5cef4c06b68c5`; function references `survey_origin` and `onboarding_survey` | MD5 `a6896078c41547ddfa8c3c550b2896fb`; no `survey_origin` reference | Confirmed different event preservation/deduplication logic. |
| `user_survey_completed_idx` | Absent | Present, partial index on completed rows | Additive performance/schema difference. |

The local migration `20261020153546_preserve_legacy_survey_events.sql` explains the Production column/function shape. It does not explain why Staging omitted it.

### Functions and DDL hardening

| Object | Production | Staging |
|---|---|---|
| `private.queue_due_reminder_deliveries` | MD5 `8c45be1f52d72a76dd3321c3cb0fdcca` | Same |
| `public.consume_my_in_app_deliveries` | MD5 `7c7f5cbbd5a66f19de67e61d6c55b450` | Same |
| `public.expire_trials()` | MD5 `bd07750bad7553f4f521dd8a0442873d`; implemented subscription update | MD5 `ee1acfbbd2ccce25bcd3a5b911b76f98`; no-op |
| Event trigger `ensure_rls` | Present; `ddl_command_end`; calls `public.rls_auto_enable` | Absent |

Function hashes are current-definition evidence only; they do not reconstruct historical migration SQL.

### RLS, policies, indexes and foreign keys

| Check | Production | Staging |
|---|---:|---:|
| Public base tables | 37 | 37 |
| RLS-enabled public tables | 37 | 37 |
| RLS-disabled public tables | 0 | 0 |
| Public policies | 81 | 81 |
| Ordered policy-definition MD5 | `879fd733458dee9f5b1b0e3c08d4134d` | Same |

The live catalog also confirms `happy_notifications.event_id/person_id/task_id` and `reminder_deliveries.reminder_id` use `ON DELETE CASCADE`. This affects future durable-content/deletion decisions and was not changed.

## Classification and risks

| Finding | Classification | Risk |
|---|---|---|
| Production version renumbering | History divergence; SQL unverified | Preview/CLI reconciliation may skip or double-apply history. |
| Staging generated versions and reordering | History/order divergence | Dependency order cannot be inferred from GitHub sequence. |
| Staging-only onboarding migration | Unmapped remote SQL | Blind replay cannot account for its behavior. |
| Missing Staging survey migration | Confirmed behavior gap | Onboarding event preservation differs across environments. |
| `survey_origin` and survey RPC mismatch | Confirmed schema/function divergence | Different deduplication and legacy-event behavior. |
| Staging no-op `expire_trials` | Confirmed behavior divergence | Staging cannot validate Production trial expiry. |
| Missing Staging `ensure_rls` | Confirmed hardening divergence | Future DDL has different automatic RLS protection. |
| Matching RLS/policies and reminder functions | Confirmed current object equality | Does not prove all dependencies/history equal. |

## Recommended reconciliation sequence

1. Freeze and archive the commit, both ledgers, engine versions, catalog extracts, object hashes, policies, RLS flags, indexes, triggers and FK rules.
2. Obtain authoritative migration SQL/provenance for both remote-only and renumbered histories. Do not infer SQL from names.
3. Decide the canonical history policy; do not rewrite or delete ledger rows to silence Preview.
4. Reproduce both states in a disposable, synthetic-data environment and compare complete schemas, grants, functions, triggers, policies, indexes, extensions and schedules.
5. Design additive corrective migrations only after the history decision and target behavior are approved.
6. Reconcile Staging first, verify, then separately schedule Production. Re-run this three-way audit after every change.

## Disposable environment plan

Create an isolated disposable project/branch only with explicit cost/authorization approval. Use schema fixtures and synthetic users; never copy personal Production data. Reproduce the observed Staging-only/local-only cases, apply candidate additive migrations, and verify:

- migration ledger and Preview validation;
- onboarding event preservation and deduplication;
- `expire_trials()`;
- RLS owner isolation and `ensure_rls` behavior;
- reminder queue/consume and notification cascade behavior;
- functions, grants, indexes, triggers, policies, extensions and cron metadata.

Destroying the disposable environment requires explicit approval; preserve its evidence first.

## Staging strategy

Preserve a read-only evidence snapshot and provider backup/restore point. Identify the Staging-only migration SQL and decide the survey migration contract. Do not run migration repair while provenance is unknown. Apply only approved additive changes after disposable validation; verify onboarding, expiry, reminders, RLS, deletion and Preview validation. Re-run the mapping.

## Production strategy

Production is ACTIVE_HEALTHY but historically renumbered. Do not replay the 18 same-name migrations or rewrite its history. Capture provider backup/restore evidence, decide an explicit history policy, test additive corrections in disposable/Staging, and use an owner-approved window and rollback plan.

## Backup, rollback and readiness

- Preserve provider backups/restore points, pre-change ledgers and schema/object snapshots.
- Prefer additive forward corrections; rollback by restore or reviewed inverse migration, never by history deletion/repair.
- Stop on any failed isolated verification; retain evidence and do not proceed to Production.
- Do not replay legacy delivery records as part of reconciliation.

AUDIT-03C-2B may begin only when: both authoritative histories and object snapshots are archived; Staging-only and local-only migrations have an explicit disposition; target behavior for `survey_origin`, survey RPC, `expire_trials()`, `ensure_rls` and the index is approved; dependent SQL equivalence is proven or explicitly excluded as UNVERIFIED; disposable and Staging tests pass; rollback is rehearsed; RLS/owner-isolation checks pass; and the owner approves the first small implementation PR. No `db push`, reset, repair, DDL/DML or Production change is implied by this document.

## Status

**Documentation-only audit artifact.** No Supabase environment, migration history, schema, RLS, cron, Edge Function, secret or Production/Staging setting was changed.
