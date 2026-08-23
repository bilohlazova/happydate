import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Person profile includes one canonical gift management workspace", async () => {
  const [profile, manager] = await Promise.all([
    source("src/components/people/PersonProfileContent.tsx"),
    source("src/components/people/PersonGiftManager.tsx"),
  ]);
  assert.equal((profile.match(/<PersonGiftManager/g) ?? []).length, 1);
  assert.match(manager, /loadPersonGiftManagement/);
  assert.match(manager, /createPersonGiftIdea/);
  assert.match(manager, /changePersonGiftLifecycle/);
  assert.match(manager, /renamePersonGiftIdea/);
  assert.match(manager, /removePersonGiftIdea/);
  assert.match(manager, /savePersonGiftLink/);
  assert.match(manager, /removePersonGiftLink/);
  assert.match(manager, /movePersonGiftLink/);
  assert.match(manager, /choosePersonGiftLink/);
});

test("a chat gift-link target resolves only through the loaded person-owned workspace", async () => {
  const manager = await source("src/components/people/PersonGiftManager.tsx");
  assert.match(manager, /window\.location\.hash\.startsWith\("#gift-link-"\)/);
  assert.match(manager, /try \{\s+linkId = decodeURIComponent/);
  assert.match(manager, /catch \{\s+return;/);
  assert.match(manager, /model\.savedLinks\.find\(\(link\) => link\.id === linkId\)/);
  assert.match(manager, /document\.getElementById\("gift-workspace"\)/);
  assert.match(manager, /row\.scrollIntoView\(\{ behavior: "smooth", block: "center" \}\)/);
  assert.match(manager, /row\.focus\(\{ preventScroll: true \}\)/);
});

test("given history and external link actions require explicit safe interaction", async () => {
  const manager = await source("src/components/people/PersonGiftManager.tsx");
  assert.match(manager, /next === "given" && !window\.confirm/);
  assert.match(manager, /type="url"/);
  assert.match(manager, /pattern="https:\/\/\.\*"/);
  assert.match(manager, /target="_blank" rel="noopener noreferrer"/);
  assert.match(manager, /window\.confirm\(t\("confirmDeleteLink"\)\)/);
  assert.match(manager, /confirmDeleteGiftWithLinks/);
  assert.match(manager, /gift\.lifecycle !== "given"/);
  assert.match(manager, /linkedCount > 0/);
  assert.match(manager, /giftId: linkGiftId \|\| null/);
  assert.match(manager, /link\.giftId === gift\.id/);
  assert.match(manager, /link\.giftId === null/);
  assert.match(manager, /<select value=\{linkGiftId\}/);
  assert.match(manager, /value=\{link\.giftId \?\? ""\}/);
  assert.match(manager, /movePersonGiftLink\(link\.id, giftId\)/);
  assert.match(manager, /choosePersonGiftLink\(link\.id, preferred, note\)/);
  assert.match(manager, /link\.isPreferred/);
  assert.match(manager, /maxLength=\{500\}/);
  assert.match(manager, /gift\.finalSelection/);
  assert.match(manager, /finalSelectionWithoutLink/);
  assert.match(manager, /confirmPersonGiftOutcome/);
  assert.match(manager, /gift\.lifecycle === "given"/);
  assert.match(manager, /\["liked", "not_liked", "unsure"\]/);
});

test("canonical gift edits and deletes stay owner-scoped and preserve given history", async () => {
  const persistence = await source("src/lib/gifts/gift.persistence.ts");
  assert.match(persistence, /updateCanonicalGiftTitle/);
  assert.match(persistence, /deleteCanonicalGift/);
  assert.equal((persistence.match(/\.eq\("user_id", userId\)\.neq\("lifecycle", "given"\)/g) ?? []).length >= 2, true);
  assert.match(persistence, /Active gift was not found/);
});

test("confirmed outcome can be excluded from learning without deleting it", async () => {
  const [manager, loader] = await Promise.all([
    source("src/components/people/PersonGiftManager.tsx"),
    source("src/lib/gifts/gift.loaders.ts"),
  ]);
  assert.match(manager, /outcomeLearningLabel/);
  assert.match(manager, /current\.learningEnabled/);
  assert.match(manager, /changePersonGiftOutcomeLearning/);
  assert.match(loader, /setGiftOutcomeLearning/);
});

test("Person profile audits learning-active and history-only outcomes", async () => {
  const profile = await source("src/components/people/PersonProfileContent.tsx");
  assert.match(profile, /GiftLearningAuditSection/);
  assert.match(profile, /confirmedGiftOutcomes/);
  assert.match(profile, /item\.learningEnabled/);
  assert.match(profile, /role="switch"/);
  assert.match(profile, /changePersonGiftOutcomeLearning/);
  assert.match(profile, /profileUi\.learningAudit\.historyReasonProfile/);
  assert.match(profile, /profileUi\.learningAudit\.historyReasonGift/);
  assert.match(profile, /profileUi\.learningAudit\.signal/);
  assert.match(profile, /learningSignalTone/);
});

test("Person timeline and feedback audit expose confirmed reaction notes with direct editing", async () => {
  const [profile, builder] = await Promise.all([
    source("src/components/people/PersonProfileContent.tsx"),
    source("src/lib/people/buildPeopleViewModels.ts"),
  ]);
  assert.match(builder, /giftOutcome: gift\.finalOutcome\.value/);
  assert.match(builder, /giftOutcomeNote: gift\.finalOutcome\.note/);
  assert.match(profile, /item\.giftOutcomeNote/);
  assert.match(profile, /beginEditing\(item\)/);
  assert.match(profile, /confirmPersonGiftOutcome\(item\.giftId, editingOutcome, note \|\| null\)/);
  assert.match(profile, /maxLength=\{500\}/);
  assert.match(profile, /profileUi\.learningAudit\.saveEdit/);
});

test("feedback audit explains effective note consent across profile and Gift controls", async () => {
  const [profile, loader, builder, preference] = await Promise.all([
    source("src/components/people/PersonProfileContent.tsx"),
    source("src/lib/people/people.loaders.ts"),
    source("src/lib/people/buildPeopleViewModels.ts"),
    source("src/lib/repositories/profile/giftOutcomeLearning.repository.ts"),
  ]);
  assert.match(preference, /loadGiftOutcomeLearningEnabled/);
  assert.match(preference, /\.eq\("id", userId\)/);
  assert.match(loader, /loadGiftOutcomeLearningEnabled\(userId\)/);
  assert.match(builder, /aiEligible: profileLearningEnabled && item\.learningEnabled/);
  assert.match(profile, /item\.aiEligible/);
  assert.match(profile, /noteUsedByAi/);
  assert.match(profile, /noteHistoryOnlyProfile/);
  assert.match(profile, /noteHistoryOnlyGift/);
  assert.match(profile, /href="\/profile"/);
});

test("AI context preview shares the bounded ID-free projection with Conversation Brain", async () => {
  const [profile, builder, projection, chat] = await Promise.all([
    source("src/components/people/PersonProfileContent.tsx"),
    source("src/lib/people/buildPeopleViewModels.ts"),
    source("src/lib/gift-intelligence/giftOutcomeAiContextPreview.ts"),
    source("src/lib/assistant/chatContract.ts"),
  ]);
  assert.match(builder, /projectGiftOutcomeAiContext/);
  assert.match(chat, /projectGiftOutcomeAiContext\(outcomes\)/);
  assert.match(projection, /GIFT_OUTCOME_AI_CONTEXT_LIMIT = 10/);
  assert.match(projection, /giftTitle,/);
  assert.match(projection, /note: boundedText\(item\.note, 500\)/);
  assert.doesNotMatch(projection, /giftId|personId|userId/);
  assert.match(profile, /giftOutcomeAiPreview/);
  assert.match(profile, /previewPrivacy/);
});

test("AI context export writes only the safe preview to the local clipboard", async () => {
  const [profile, projection] = await Promise.all([
    source("src/components/people/PersonProfileContent.tsx"),
    source("src/lib/gift-intelligence/giftOutcomeAiContextPreview.ts"),
  ]);
  assert.match(profile, /formatGiftOutcomeAiContextExport\(aiPreview/);
  assert.match(profile, /exportLimitFooter", \{ omitted, shown, limit \}/);
  assert.match(profile, /generatedAt: new Date\(generated\.iso\)/);
  assert.match(profile, /locale,/);
  assert.match(profile, /timeZone,/);
  assert.match(profile, /omittedCount: olderEligibleCount/);
  assert.match(profile, /Intl\.DateTimeFormat\(\)\.resolvedOptions\(\)\.timeZone/);
  assert.match(profile, /const generated = previewGeneratedAt \?\? createPreviewGeneratedAt\(\)/);
  assert.match(profile, /writeClipboardWithTimeout\(exportText\)/);
  assert.match(profile, /navigator\.clipboard\.writeText\(text\)/);
  assert.doesNotMatch(profile, /fetch\([\s\S]*exportText/);
  assert.match(projection, /formatGiftOutcomeAiContextExport/);
  assert.doesNotMatch(projection, /giftId|personId|userId|confirmedAt/);
});

test("AI preview can exclude one outcome without deleting its history", async () => {
  const profile = await source("src/components/people/PersonProfileContent.tsx");
  assert.match(profile, /previewSources = items\.filter\(\(item\) => item\.aiEligible\)/);
  assert.match(profile, /onClick=\{\(\) => void excludeFromPreview\(source\)\}/);
  assert.match(profile, /excludePreviewHelp/);
  assert.match(profile, /changePersonGiftOutcomeLearning\(item\.giftId, !item\.learningEnabled\)/);
  assert.doesNotMatch(profile, /deletePersonGiftOutcome/);
});

test("an accidental AI preview exclusion has a bounded undo action", async () => {
  const profile = await source("src/components/people/PersonProfileContent.tsx");
  assert.match(profile, /setLastExcluded\(\{ giftId: item\.giftId, giftTitle: item\.giftTitle \}\)/);
  assert.match(profile, /window\.setTimeout\(\(\) => setLastExcluded\(null\), 8_000\)/);
  assert.match(profile, /changePersonGiftOutcomeLearning\(excluded\.giftId, true\)/);
  assert.match(profile, /aria-live="polite"/);
  assert.match(profile, /undoExclusionError/);
});

test("history-only audit filter keeps excluded outcomes permanently discoverable", async () => {
  const profile = await source("src/components/people/PersonProfileContent.tsx");
  assert.match(profile, /auditFilter.*"all" \| "ai_used" \| "history_only"/);
  assert.match(profile, /items\.filter\(\(item\) => !item\.aiEligible\)/);
  assert.match(profile, /aria-pressed=\{auditFilter === "history_only"\}/);
  assert.match(profile, /filteredItems\.map/);
  assert.match(profile, /profileUi\.learningAudit\.filterEmpty/);
  assert.match(profile, /onClick=\{\(\) => void change\(item\)\}/);
});

test("history-only outcomes explain profile-wide and per-Gift restrictions separately", async () => {
  const profile = await source("src/components/people/PersonProfileContent.tsx");
  assert.match(profile, /historyReasonProfile/);
  assert.match(profile, /historyReasonGift/);
  assert.match(profile, /!profileLearningEnabled \? "border-amber-200 bg-amber-50"/);
  assert.match(profile, /href="\/profile"/);
  assert.match(profile, /historyReasonGiftHelp/);
});

test("history-only header exposes a compact non-exclusive reason breakdown", async () => {
  const profile = await source("src/components/people/PersonProfileContent.tsx");
  assert.match(profile, /profileRestrictedCount = profileLearningEnabled \? 0 : items\.length/);
  assert.match(profile, /individualExcludedCount = items\.filter\(\(item\) => !item\.learningEnabled\)\.length/);
  assert.match(profile, /breakdownProfile/);
  assert.match(profile, /breakdownGift/);
  assert.match(profile, /breakdownOverlap/);
  assert.match(profile, /aria-label=\{t\("profileUi\.learningAudit\.breakdownLabel"\)\}/);
});

test("individual history-only outcomes expose one explicit AI restoration action", async () => {
  const profile = await source("src/components/people/PersonProfileContent.tsx");
  assert.match(profile, /profileLearningEnabled && !item\.learningEnabled/);
  assert.match(profile, /onClick=\{\(\) => void change\(item\)\}/);
  assert.match(profile, /profileUi\.learningAudit\.allowAiLabel/);
  assert.match(profile, /profileUi\.learningAudit\.allowAi/);
  assert.doesNotMatch(profile, /function allowAi/);
});

test("successful restoration confirms the Gift and exits an empty history-only view", async () => {
  const profile = await source("src/components/people/PersonProfileContent.tsx");
  assert.match(profile, /returnToAll = enabling && profileLearningEnabled && auditFilter === "history_only" && historyOnlyCount === 1/);
  assert.match(profile, /setLastRestored\(\{ giftTitle: item\.giftTitle, returnedToAll: returnToAll \}\)/);
  assert.match(profile, /setLastRestored\(\{ giftTitle: excluded\.giftTitle, returnedToAll: returnToAll \}\)/);
  assert.match(profile, /if \(returnToAll\) setAuditFilter\("all"\)/);
  assert.match(profile, /restoredConfirmation/);
  assert.match(profile, /returnedToAll/);
  assert.match(profile, /window\.setTimeout\(\(\) => setLastRestored\(null\), 8_000\)/);
});

test("AI-used filter audits effective consent without opening the preview", async () => {
  const profile = await source("src/components/people/PersonProfileContent.tsx");
  assert.match(profile, /"all" \| "ai_used" \| "history_only"/);
  assert.match(profile, /auditFilter === "ai_used"/);
  assert.match(profile, /items\.filter\(\(item\) => item\.aiEligible\)/);
  assert.match(profile, /aria-pressed=\{auditFilter === "ai_used"\}/);
  assert.match(profile, /filterAiUsed/);
  assert.match(profile, /filterAiEmpty/);
});

test("AI-used filter summarizes note-backed and reaction-only evidence without exposing content", async () => {
  const profile = await source("src/components/people/PersonProfileContent.tsx");
  assert.match(profile, /item\.aiEligible && Boolean\(item\.note\?\.trim\(\)\)/);
  assert.match(profile, /activeReactionOnlyCount = activeCount - activeWithNoteCount/);
  assert.match(profile, /auditFilter === "ai_used" && activeCount > 0/);
  assert.match(profile, /aiEvidenceSummaryLabel/);
  assert.match(profile, /aiEvidenceWithNotes/);
  assert.match(profile, /aiEvidenceReactionOnly/);
  assert.match(profile, /aiEvidenceSummaryHelp/);
});

test("reaction-only AI evidence offers the existing optional note editor directly", async () => {
  const profile = await source("src/components/people/PersonProfileContent.tsx");
  assert.match(profile, /auditFilter === "ai_used" && item\.aiEligible && !item\.note\?\.trim\(\) && editingId !== item\.giftId/);
  assert.match(profile, /onClick=\{\(\) => beginEditing\(item, true, `gift-audit-context-\$\{item\.giftId\}`\)\}/);
  assert.match(profile, /addContextLabel/);
  assert.match(profile, /addContext/);
  assert.match(profile, /const note = editingNote\.trim\(\)/);
  assert.match(profile, /confirmPersonGiftOutcome\(item\.giftId, editingOutcome, note \|\| null\)/);
});

test("direct context action moves focus to its note while general editing preserves normal order", async () => {
  const profile = await source("src/components/people/PersonProfileContent.tsx");
  assert.match(profile, /function beginEditing\(item: ConfirmedGiftOutcomeViewModel, focusNote = false, originControlId = `gift-audit-edit-\$\{item\.giftId\}`\)/);
  assert.match(profile, /pendingNoteFocusIdRef\.current = focusNote \? item\.giftId : null/);
  assert.match(profile, /pendingNoteFocusIdRef\.current !== editingId/);
  assert.match(profile, /noteInputRef\.current\?\.focus\(\)/);
  assert.match(profile, /<textarea ref=\{noteInputRef\}/);
  assert.match(profile, /onClick=\{\(\) => beginEditing\(item\)\} aria-label=\{t\("profileUi\.learningAudit\.edit"/);
});

test("cancelling outcome editing returns focus to its exact origin without affecting save", async () => {
  const profile = await source("src/components/people/PersonProfileContent.tsx");
  assert.match(profile, /editorOriginIdRef\.current = originControlId/);
  assert.match(profile, /pendingReturnFocusIdRef\.current = editorOriginIdRef\.current/);
  assert.match(profile, /document\.getElementById\(pendingReturnFocusIdRef\.current\)\?\.focus\(\)/);
  assert.match(profile, /onClick=\{cancelEditing\}/);
  assert.match(profile, /await confirmPersonGiftOutcome[\s\S]*?editorOriginIdRef\.current = null;[\s\S]*?setEditingId\(null\)/);
  assert.doesNotMatch(profile.match(/async function saveEdit[\s\S]*?async function copyPreview/)?.[0] ?? "", /pendingReturnFocusIdRef\.current =/);
});

test("successful direct context enrichment announces a bounded content-free confirmation", async () => {
  const profile = await source("src/components/people/PersonProfileContent.tsx");
  assert.match(profile, /savedFromContextAction = editorOriginIdRef\.current === `gift-audit-context-\$\{item\.giftId\}` && !item\.note\?\.trim\(\) && Boolean\(note\)/);
  assert.match(profile, /if \(savedFromContextAction\) setLastContextSaved\(\{ giftTitle: item\.giftTitle \}\)/);
  assert.match(profile, /window\.setTimeout\(\(\) => setLastContextSaved\(null\), 8_000\)/);
  assert.match(profile, /contextSavedConfirmation/);
  assert.match(profile, /role="status" aria-live="polite"/);
});

test("context confirmation opens the canonical safe AI preview", async () => {
  const profile = await source("src/components/people/PersonProfileContent.tsx");
  assert.match(profile, /aria-controls="gift-outcome-ai-preview"/);
  assert.match(profile, /id="gift-outcome-ai-preview"/);
  assert.match(profile, /onClick=\{openSavedContextPreview\}/);
  assert.match(profile, /viewAiContext/);
  assert.match(profile, /giftOutcomeAiPreview/);
});

test("confirmation preview action focuses the controlled region without changing ordinary disclosure focus", async () => {
  const profile = await source("src/components/people/PersonProfileContent.tsx");
  assert.match(profile, /function openSavedContextPreview\(\)/);
  assert.match(profile, /pendingPreviewFocusRef\.current = true;[\s\S]*?setPreviewOpen\(true\)/);
  assert.match(profile, /previewRegionRef\.current\?\.focus\(\)/);
  assert.match(profile, /ref=\{previewRegionRef\} id="gift-outcome-ai-preview"/);
  assert.match(profile, /aria-labelledby="gift-outcome-ai-preview-heading"/);
  assert.match(profile, /aria-describedby="gift-outcome-ai-preview-help gift-outcome-ai-preview-scope gift-outcome-ai-preview-generated-at" tabIndex=\{-1\}/);
  assert.match(profile, /onClick=\{togglePreview\}/);
});

test("explicit preview close restores its opener with a durable disclosure fallback", async () => {
  const profile = await source("src/components/people/PersonProfileContent.tsx");
  assert.match(profile, /previewOriginIdRef\.current = "gift-outcome-ai-preview-from-confirmation"/);
  assert.match(profile, /if \(!previewOpen\) \{[\s\S]*?previewOriginIdRef\.current = "gift-outcome-ai-preview-toggle"/);
  assert.match(profile, /pendingPreviewReturnFocusRef\.current = true/);
  assert.match(profile, /origin \?\? document\.getElementById\("gift-outcome-ai-preview-toggle"\)/);
  assert.match(profile, /onClick=\{closePreview\}/);
  assert.match(profile, /closeAiContext/);
});

test("Escape closes the focused inline preview through the same focus-return path", async () => {
  const profile = await source("src/components/people/PersonProfileContent.tsx");
  assert.match(profile, /function handlePreviewKeyDown\(event: KeyboardEvent<HTMLDivElement>\)/);
  assert.match(profile, /if \(event\.key !== "Escape"\) return/);
  assert.match(profile, /event\.preventDefault\(\)/);
  assert.match(profile, /event\.stopPropagation\(\)/);
  assert.match(profile, /onKeyDown=\{handlePreviewKeyDown\}/);
  assert.match(profile, /closePreview\(\)/);
  assert.doesNotMatch(profile, /aria-modal=/);
  assert.doesNotMatch(profile, /role="dialog"/);
});

test("focused AI preview is an inline region named by its localized heading", async () => {
  const profile = await source("src/components/people/PersonProfileContent.tsx");
  assert.match(profile, /id="gift-outcome-ai-preview" role="region" aria-labelledby="gift-outcome-ai-preview-heading"/);
  assert.match(profile, /<h3 id="gift-outcome-ai-preview-heading"[^>]*>\{t\("profileUi\.learningAudit\.previewTitle"\)\}<\/h3>/);
  assert.match(profile, /previewDescription", \{ count: aiPreview\.length \}/);
  assert.doesNotMatch(profile, /aria-modal=/);
});

test("open preview describes its local Escape shortcut without burdening collapsed controls", async () => {
  const profile = await source("src/components/people/PersonProfileContent.tsx");
  assert.match(profile, /aria-describedby="gift-outcome-ai-preview-help gift-outcome-ai-preview-scope gift-outcome-ai-preview-generated-at"/);
  assert.match(profile, /id="gift-outcome-ai-preview-help"[^>]*>\{t\("profileUi\.learningAudit\.previewEscapeHelp"\)\}<\/p>/);
  assert.match(profile, /previewOpen && <div/);
  assert.doesNotMatch(profile.match(/id="gift-outcome-ai-preview-toggle"[\s\S]*?<\/button>/)?.[0] ?? "", /previewEscapeHelp/);
});

test("focused preview announces shortcut before its current bounded data scope", async () => {
  const profile = await source("src/components/people/PersonProfileContent.tsx");
  assert.match(profile, /aria-describedby="gift-outcome-ai-preview-help gift-outcome-ai-preview-scope gift-outcome-ai-preview-generated-at"/);
  assert.match(profile, /id="gift-outcome-ai-preview-scope"[^>]*>\{t\("profileUi\.learningAudit\.previewDescription", \{ count: aiPreview\.length \}\)\}<\/p>/);
  assert.match(profile, /gift-outcome-ai-preview-help gift-outcome-ai-preview-scope/);
});

test("open preview shows the exact local generation metadata reused by clipboard export", async () => {
  const profile = await source("src/components/people/PersonProfileContent.tsx");
  assert.match(profile, /setPreviewGeneratedAt\(createPreviewGeneratedAt\(\)\)/);
  assert.match(profile, /id="gift-outcome-ai-preview-generated-at"/);
  assert.match(profile, /formatGiftOutcomeAiContextGeneratedAt\(new Date\(previewGeneratedAt\.iso\), locale, previewGeneratedAt\.timeZone\)/);
  assert.match(profile, /aria-describedby="gift-outcome-ai-preview-help gift-outcome-ai-preview-scope gift-outcome-ai-preview-generated-at"/);
  assert.match(profile, /generatedAt: new Date\(generated\.iso\)/);
  assert.match(profile, /timeZone: generated\.timeZone/);
});

test("open preview deliberately refreshes export metadata without stale copy confirmation", async () => {
  const profile = await source("src/components/people/PersonProfileContent.tsx");
  assert.match(profile, /function refreshPreviewGeneratedAt\(\)/);
  assert.match(profile, /setPreviewGeneratedAt\(createPreviewGeneratedAt\(\)\);[\s\S]*?setCopyStatus\("idle"\)/);
  assert.match(profile, /onClick=\{refreshPreviewGeneratedAt\}/);
  assert.match(profile, /profileUi\.learningAudit\.refreshExportTime/);
  assert.doesNotMatch(profile.match(/function refreshPreviewGeneratedAt\(\)[\s\S]*?\n  \}/)?.[0] ?? "", /setPreviewOpen/);
});

test("preview refresh announces its exact result without moving focus", async () => {
  const profile = await source("src/components/people/PersonProfileContent.tsx");
  assert.match(profile, /setLastPreviewRefresh\(refreshed\)/);
  assert.match(profile, /lastPreviewRefresh && <p role="status" aria-live="polite" className="sr-only">/);
  assert.match(profile, /refreshExportTimeDone", \{ dateTime: formatGiftOutcomeAiContextGeneratedAt\(new Date\(lastPreviewRefresh\.iso\), locale, lastPreviewRefresh\.timeZone\), zone: lastPreviewRefresh\.timeZone \}/);
  assert.match(profile, /setLastPreviewRefresh\(null\)/);
  assert.doesNotMatch(profile.match(/function refreshPreviewGeneratedAt\(\)[\s\S]*?\n  \}/)?.[0] ?? "", /\.focus\(/);
});

test("preview refresh control names the exact currently prepared export", async () => {
  const profile = await source("src/components/people/PersonProfileContent.tsx");
  assert.match(profile, /aria-label=\{t\("profileUi\.learningAudit\.refreshExportTimeLabel", \{ dateTime: formatGiftOutcomeAiContextGeneratedAt\(new Date\(previewGeneratedAt\.iso\), locale, previewGeneratedAt\.timeZone\), zone: previewGeneratedAt\.timeZone \}\)\}/);
  assert.match(profile, />\{t\("profileUi\.learningAudit\.refreshExportTime"\)\}<\/button>/);
});

test("copy control names the exact prepared export before clipboard access", async () => {
  const profile = await source("src/components/people/PersonProfileContent.tsx");
  assert.match(profile, /aria-label=\{copyStatus === "copying" \? t\("profileUi\.learningAudit\.copyingPreview"\) : previewGeneratedAt \? t\("profileUi\.learningAudit\.copyPreviewLabel", \{ dateTime: formatGiftOutcomeAiContextGeneratedAt\(new Date\(previewGeneratedAt\.iso\), locale, previewGeneratedAt\.timeZone\), zone: previewGeneratedAt\.timeZone \}\) : t\("profileUi\.learningAudit\.copyPreview"\)\}/);
  assert.match(profile, /<Copy className="h-3\.5 w-3\.5" aria-hidden="true" \/>/);
  assert.match(profile, /generatedAt: new Date\(generated\.iso\)/);
});

test("successful Copy confirms the exact version written to the local clipboard", async () => {
  const profile = await source("src/components/people/PersonProfileContent.tsx");
  assert.match(profile, /await writeClipboardWithTimeout\(exportText\);[\s\S]*?setLastCopiedPreview\(generated\);[\s\S]*?setCopyStatus\("copied"\)/);
  assert.match(profile, /copyStatus === "copied" && lastCopiedPreview && <p role="status"/);
  assert.match(profile, /copyLocalOnlyAt", \{ dateTime: formatGiftOutcomeAiContextGeneratedAt\(new Date\(lastCopiedPreview\.iso\), locale, lastCopiedPreview\.timeZone\), zone: lastCopiedPreview\.timeZone \}/);
  assert.match(profile, /setLastCopiedPreview\(null\)/);
});

test("successful Copy button shows the copied version's short localized time", async () => {
  const profile = await source("src/components/people/PersonProfileContent.tsx");
  assert.match(profile, /copyStatus === "copied" && lastCopiedPreview \? t\("profileUi\.learningAudit\.copyDoneAt", \{ time: formatGiftOutcomeAiContextTime\(new Date\(lastCopiedPreview\.iso\), locale, lastCopiedPreview\.timeZone\) \}\)/);
  assert.match(profile, /copyLocalOnlyAt/);
});

test("Clipboard write exposes one bounded accessible in-progress state", async () => {
  const profile = await source("src/components/people/PersonProfileContent.tsx");
  assert.match(profile, /"idle" \| "copying" \| "copied" \| "error" \| "timeout"/);
  assert.match(profile, /if \(copyStatus === "copying"\) return;/);
  assert.match(profile, /setCopyStatus\("copying"\)/);
  assert.match(profile, /disabled=\{copyStatus === "copying"\}/);
  assert.match(profile, /aria-busy=\{copyStatus === "copying"\}/);
  assert.match(profile, /copyStatus === "copying" \? t\("profileUi\.learningAudit\.copyingPreview"\)/);
  assert.match(profile, /LoaderCircle className="h-3\.5 w-3\.5 animate-spin" aria-hidden="true"/);
});

test("Clipboard transaction keeps preview time and disclosure stable until settlement", async () => {
  const profile = await source("src/components/people/PersonProfileContent.tsx");
  assert.match(profile, /function togglePreview\(\) \{[\s\S]*?if \(copyStatus === "copying"\) return;/);
  assert.match(profile, /function refreshPreviewGeneratedAt\(\) \{[\s\S]*?if \(copyStatus === "copying"\) return;/);
  assert.match(profile, /function closePreview\(\) \{[\s\S]*?if \(copyStatus === "copying"\) return;/);
  assert.match(profile, /event\.stopPropagation\(\);[\s\S]*?if \(copyStatus === "copying"\) return;[\s\S]*?closePreview\(\)/);
  assert.match(profile, /disabled=\{previewOpen && copyStatus === "copying"\}/);
  assert.match(profile, /disabled=\{copyStatus === "copying"\} onClick=\{refreshPreviewGeneratedAt\}/);
  assert.match(profile, /disabled=\{copyStatus === "copying"\} onClick=\{closePreview\}/);
});

test("Clipboard transaction blocks per-record preview exclusion", async () => {
  const profile = await source("src/components/people/PersonProfileContent.tsx");
  assert.match(profile, /async function excludeFromPreview\(item: ConfirmedGiftOutcomeViewModel\) \{[\s\S]*?if \(busyId \|\| copyStatus === "copying"\) return;/);
  assert.match(profile, /disabled=\{busyId !== null \|\| copyStatus === "copying"\} onClick=\{\(\) => void excludeFromPreview\(source\)\}/);
});

test("pending Clipboard transaction explains its temporary control lock", async () => {
  const profile = await source("src/components/people/PersonProfileContent.tsx");
  assert.match(profile, /copyStatus === "copying" && <p role="status" aria-live="polite"/);
  assert.match(profile, /profileUi\.learningAudit\.copyLockHelp/);
});

test("stalled Clipboard writes time out without claiming success", async () => {
  const profile = await source("src/components/people/PersonProfileContent.tsx");
  assert.match(profile, /const CLIPBOARD_WRITE_TIMEOUT_MS = 10_000/);
  assert.match(profile, /Promise\.race\(\[/);
  assert.match(profile, /ClipboardWriteTimeoutError/);
  assert.match(profile, /window\.clearTimeout\(timeoutId\)/);
  assert.match(profile, /if \(error instanceof ClipboardWriteTimeoutError\) \{[\s\S]*?retryingCopyRef\.current = false;[\s\S]*?setCopyStatus\("timeout"\)/);
  assert.match(profile, /pendingRetryFocusRef\.current = true;[\s\S]*?setCopyStatus\("error"\)/);
  assert.match(profile, /copyStatus === "timeout" && <p id="gift-outcome-copy-timeout" role="alert"/);
  assert.match(profile, /profileUi\.learningAudit\.copyTimeout/);
});

test("ordinary Clipboard errors offer retry while uncertain timeouts do not", async () => {
  const profile = await source("src/components/people/PersonProfileContent.tsx");
  assert.match(profile, /copyStatus === "error" && <div role="alert"/);
  assert.match(profile, /onClick=\{retryCopy\}/);
  assert.match(profile, /profileUi\.learningAudit\.retryCopy/);
  const timeoutBranch = profile.match(/copyStatus === "timeout" && <p role="alert"[\s\S]*?<\/p>}\{copyStatus === "error"/)?.[0] ?? "";
  assert.doesNotMatch(timeoutBranch, /retryCopy/);
});

test("ordinary-error Retry names the exact prepared export", async () => {
  const profile = await source("src/components/people/PersonProfileContent.tsx");
  assert.match(profile, /aria-label=\{previewGeneratedAt \? t\("profileUi\.learningAudit\.retryCopyLabel", \{ dateTime: formatGiftOutcomeAiContextGeneratedAt\(new Date\(previewGeneratedAt\.iso\), locale, previewGeneratedAt\.timeZone\), zone: previewGeneratedAt\.timeZone \}\) : t\("profileUi\.learningAudit\.retryCopy"\)\}/);
  assert.match(profile, />\{t\("profileUi\.learningAudit\.retryCopy"\)\}<\/button>/);
});

test("ordinary-error Retry has a complete keyboard focus recovery path", async () => {
  const profile = await source("src/components/people/PersonProfileContent.tsx");
  assert.match(profile, /pendingRetryFocusRef\.current = true;[\s\S]*?setCopyStatus\("error"\)/);
  assert.match(profile, /copyStatus === "error" && pendingRetryFocusRef\.current[\s\S]*?retryCopyRef\.current\?\.focus\(\)/);
  assert.match(profile, /function retryCopy\(\) \{[\s\S]*?retryingCopyRef\.current = true;[\s\S]*?void copyPreview\(\)/);
  assert.match(profile, /copyStatus === "copied" && retryingCopyRef\.current[\s\S]*?primaryCopyRef\.current\?\.focus\(\)/);
  assert.match(profile, /ref=\{primaryCopyRef\}/);
  assert.match(profile, /ref=\{retryCopyRef\}/);
});

test("timed-out Retry returns focus to primary Copy without moving initial timeout focus", async () => {
  const profile = await source("src/components/people/PersonProfileContent.tsx");
  assert.match(profile, /pendingPrimaryCopyFocusRef\.current = retryingCopyRef\.current;[\s\S]*?retryingCopyRef\.current = false;[\s\S]*?setCopyStatus\("timeout"\)/);
  assert.match(profile, /copyStatus === "timeout" && pendingPrimaryCopyFocusRef\.current[\s\S]*?primaryCopyRef\.current\?\.focus\(\);[\s\S]*?pendingPrimaryCopyFocusRef\.current = false/);
  assert.doesNotMatch(profile, /pendingPrimaryCopyFocusRef\.current = true/);
});

test("primary Copy re-exposes timeout uncertainty after focus recovery", async () => {
  const profile = await source("src/components/people/PersonProfileContent.tsx");
  assert.match(profile, /aria-describedby=\{copyStatus === "timeout" \? "gift-outcome-copy-timeout" : undefined\}/);
  assert.match(profile, /id="gift-outcome-copy-timeout" role="alert"/);
});

test("preview explains its shared ten-outcome cap only when eligible history exceeds it", async () => {
  const profile = await source("src/components/people/PersonProfileContent.tsx");
  assert.match(profile, /GIFT_OUTCOME_AI_CONTEXT_LIMIT/);
  assert.match(profile, /olderEligibleCount = Math\.max\(0, activeCount - GIFT_OUTCOME_AI_CONTEXT_LIMIT\)/);
  assert.match(profile, /olderEligibleCount > 0/);
  assert.match(profile, /previewLimitNotice", \{ shown: GIFT_OUTCOME_AI_CONTEXT_LIMIT, total: activeCount \}/);
  assert.match(profile, /previewLimitHistory", \{ count: olderEligibleCount \}/);
  const projection = await source("src/lib/gift-intelligence/giftOutcomeAiContextPreview.ts");
  assert.match(projection, /GIFT_OUTCOME_AI_CONTEXT_LIMIT = 10/);
  assert.match(projection, /outcomes\.slice\(0, GIFT_OUTCOME_AI_CONTEXT_LIMIT\)/);
});

test("moving a saved link updates only its assignment and remains owner-scoped", async () => {
  const persistence = await source("src/lib/gifts/gift.persistence.ts");
  assert.match(persistence, /moveSavedGiftLink/);
  assert.match(persistence, /\.update\(\{ gift_id: giftId \}\)/);
  assert.match(persistence, /\.eq\("id", linkId\)\.eq\("user_id", userId\)/);
  assert.doesNotMatch(persistence.match(/export async function moveSavedGiftLink[\s\S]*?return mapLink\(data\);/)?.[0] ?? "", /created_at:/);
});

test("legacy Knowledge gifts remain visibly read-only", async () => {
  const [mapper, manager] = await Promise.all([
    source("src/lib/gifts/gift.mapper.ts"),
    source("src/components/people/PersonGiftManager.tsx"),
  ]);
  assert.match(mapper, /canChangeLifecycle: gift\.sourceKnowledgeId === null/);
  assert.match(manager, /!gift\.canChangeLifecycle/);
  assert.match(manager, /legacyReadOnly/);
});

test("gift manager messages have exact locale parity", async () => {
  const locales = ["pl", "uk", "en", "ru", "de"];
  const gifts = await Promise.all(locales.map(async (locale) =>
    JSON.parse(await source(`messages/${locale}/person.json`)).profileUi.gifts
  ));
  const keys = (value, prefix = "") => Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return child && typeof child === "object" ? keys(child, path) : [path];
  }).sort();
  for (const dictionary of gifts) {
    assert.deepEqual(keys(dictionary), keys(gifts[0]));
    assert.equal(keys(dictionary).every((key) => key.length > 0), true);
  }
});
