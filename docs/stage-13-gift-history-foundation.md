# Stage 13 — Gift history and saved links foundation

## Outcome

HappyDate now has canonical, person-centred persistence for gifts and saved
external gift references. A gift is no longer inferred only from a legacy
note: it has an explicit lifecycle and becomes history only after the user
confirms that it was given.

## Domain rules

- `idea`, `selected`, `purchased`, and `given` are the only lifecycle states.
- A `given` gift always has an occurrence date.
- Every gift belongs to one authenticated user and one Person.
- Event association is optional and must belong to the same authenticated user.
- Saved links belong to a Person and may optionally reference an Event or Gift.
- Only HTTPS links are accepted.
- Merchant, image, title, and price are user-supplied metadata. They are not a
  partner verification or a guarantee that the target remains available.

## Persistence and security

- `public.gifts` stores the lifecycle and confirmed history.
- `public.gift_links` stores external references separately from gift state.
- Composite ownership constraints prevent a link from being attached to a
  different user's gift or Person.
- RLS is enabled on both tables. Anonymous access is revoked and grants for the
  authenticated role are explicit.
- Owner and related Person/Event checks run on inserts and updates.
- Foreign-key and user-facing query indexes are present.

## Compatibility

The Gift Repository merges canonical Gift rows with the existing read-only
Knowledge compatibility projection. This preserves current user data while new
writes can use the canonical model. The bridge can be removed only after a
separate, verified data migration.

## Repository API

- `createGift`
- `setGiftLifecycle`
- `loadActiveGiftIdeas`
- `loadGiftHistory`
- `listSavedGiftLinks`
- `saveGiftLink`
- `deleteSavedGiftLink`

## Person profile workspace

The Person profile now includes one responsive Gift workspace that can:

- create a canonical gift idea;
- move it through `selected`, `purchased`, and `given`;
- require explicit confirmation before adding a gift to history;
- save a labeled HTTPS link and open it in an isolated browser context;
- delete a saved link with confirmation;
- show compatibility gifts as read-only instead of writing an invalid lifecycle
  update back into legacy Notes.

All interface states are available in Polish, Ukrainian, English, Russian, and
German. Loading, empty, error, and busy states are represented explicitly.

## Next slice

The AI recommendation cards are now connected to canonical Gift persistence.
Each suggestion can be saved in one action for the active Person and optional
Event. The UI prevents repeated clicks, recognizes already-loaded matching
ideas, and reports saving, saved, and failure states in all five locales.

The current AI contract deliberately contains no product URL. Happy therefore
stores only the recommendation it actually produced and never fabricates a
merchant link. Automatic link saving remains blocked until a later retrieval
layer supplies a separately validated HTTPS product reference.

## Live synchronization

- Saving an AI recommendation reloads the canonical Gift Workspace immediately,
  so the new idea appears without a browser refresh.
- Gift changes in the Person workspace re-project the profile and timeline in
  place while request sequencing prevents an older response from overwriting a
  newer one.
- Canonical `idea`, `selected`, `purchased`, and `given` gifts are represented in
  the Person timeline; legacy and canonical profile collections are de-duplicated.
- If the post-save refresh fails, HappyDate keeps the successful save result and
  reports only the synchronization problem instead of falsely claiming the gift
  write failed.

## Idempotent active ideas

- Active Gift identity is enforced atomically by Postgres for the same user,
  Person, optional Event, and whitespace/case-normalized title.
- `NULL` Event values participate in uniqueness, so unlinked ideas are protected
  just like event-linked ideas.
- A `given` Gift no longer occupies the active identity and therefore does not
  prevent the user from considering the same kind of gift in a later year.
- Concurrent duplicate inserts return the already-existing canonical Gift to the
  caller instead of surfacing a false failure or creating a second row.
- The migration refuses to delete or silently merge pre-existing ambiguous data.

## Editing and deletion

- Canonical active ideas can be renamed inline without leaving the Person
  profile; title normalization and duplicate protection remain enforced.
- Deletion requires explicit confirmation and reports when linked saved
  references will also be removed by the existing ownership-safe cascade.
- Repository mutations always include both authenticated owner identity and Gift
  identity, while `given` history is excluded from both operations.
- Legacy Knowledge gifts and confirmed history remain read-only in this UI.
- Successful mutations reload the Gift workspace and re-project the Person
  timeline immediately.

## Gift-specific shortlists

- A saved HTTPS reference can now be assigned to one active canonical Gift from
  the Person profile form.
- Assigned options are rendered inside that Gift card, preserving the connection
  while its lifecycle moves from idea to selection and purchase.
- Existing Person-only links remain visible in a separate unassigned section and
  can still be opened or deleted, so the rollout does not hide legacy data.
- The composite Gift ownership foreign key and RLS remain the authority at the
  persistence boundary; the UI never relies on a client-only ownership check.
- Deleting a Gift still reports and removes its attached shortlist explicitly.

## Next slice

## Moving saved links

- Every saved-link row can be reassigned to another canonical Gift or returned
  to the Person-only unassigned collection.
- Reassignment updates only `gift_id`; the original `created_at`, URL, label,
  merchant, image, and price metadata remain intact.
- The control is disabled while a mutation is pending, then all Gift shortlists
  reload from canonical persistence.
- Owner-scoped UPDATE RLS and the composite Gift ownership foreign key validate
  every destination independently of the client-provided selection.

## Preferred shortlist decisions

- A Gift can have exactly one preferred saved option, protected by a partial
  unique index rather than client-only state.
- Selecting a new preferred option clears the previous choice through an
  ownership-scoped `SECURITY INVOKER` trigger; concurrent uniqueness conflicts
  receive one bounded retry in persistence.
- The user can save an optional normalized reason of up to 500 characters or
  remove the preferred decision without deleting the saved URL.
- Unassigned links cannot be preferred, and moving a preferred link back to the
  Person-only collection clears its decision metadata automatically.
- Preferred status and its reason remain visible as the parent Gift advances
  through `selected`, `purchased`, and `given`.

## Immutable purchase selection

- The first lifecycle transition into `purchased` or `given` captures the
  preferred link ID, URL, label, price, currency, and decision reason directly
  on the canonical Gift.
- The snapshot is independent of the live shortlist, so later link deletion,
  reassignment, price changes, or unavailable merchant pages cannot rewrite
  what the user actually chose.
- A `SECURITY INVOKER` trigger creates the snapshot and rejects direct or later
  edits with a database constraint error; direct trigger-function execution is
  revoked from API roles.
- Existing purchased and given Gifts receive a non-destructive backfill and a
  finalized boundary even when no preferred link existed.
- Domain records, recommendation ViewModels, and the Person profile now expose
  the immutable choice, including a safe fallback when no URL was selected.

## Next slice

## Explicit recipient outcome

- Canonical `given` Gifts ask whether the recipient liked the Gift with three
  explicit answers: `liked`, `not_liked`, or `unsure`, plus an optional note.
- The database rejects outcomes before `given`, normalizes the note, and sets the
  confirmation timestamp itself; users can deliberately correct their answer.
- A `SECURITY INVOKER` trigger enforces the confirmation contract without an AI
  inference path or direct API execution permission.
- Gift Domain and recommendation history expose the structured outcome, while
  `confirmedGiftOutcomes` provides a dedicated Memory Brain input boundary.
- The Person profile visibly distinguishes confirmed feedback and never treats
  the absence of an answer as a positive or negative signal.

## Controlled recommendation learning

- Confirmed recipient outcomes now enter gift recommendation context only when
  the account-level learning preference is enabled.
- A deterministic post-AI policy ranks matching ideas: positive evidence raises
  priority, negative evidence lowers it, and `unsure` remains visible but neutral.
- Recommendation cards expose the exact gift title and optional note supplied by
  the user. AI cannot create this evidence field.
- The Profile switch disables the feature globally. Disabled feedback is omitted
  from AI context and cannot affect ordering.
- Updating consent or a confirmed outcome invalidates affected server-side gift
  recommendation cache entries.

## Conversation Brain outcome boundary

- Gift outcome evidence is never accepted from the browser request body.
- After `auth.getUser()` verifies the bearer token, the chat route loads at most
  ten outcomes for the authenticated owner and the resolved active Person.
- Disabling gift outcome learning makes the server loader return no evidence.
- Conversation Brain receives outcomes in a separate server-generated system
  section without database IDs or timestamps.
- The prompt may cite exact gift titles and user notes, but must not turn
  `unsure` into a positive/negative reaction or generalize one outcome into a
  permanent preference.

## Deterministic feedback categories

- A fixed multilingual classifier derives one canonical gift category from the
  confirmed title and optional user note; it never calls AI and never persists
  an inferred fact.
- Conflicting or unknown terms fail closed to `other`.
- Exact text overlap has stronger ranking weight than category-only similarity.
- Category-only evidence is explicitly marked in recommendation cards and is
  treated as weak context, never as a permanent preference or prohibition.
- Conversation Brain receives the same derived category and must still cite the
  exact user-confirmed Gift when it uses that context.

## Per-outcome learning control

- Every confirmed Gift outcome keeps an independent learning inclusion flag.
- Turning it off preserves the Gift, reaction, note, and Timeline history.
- Disabled outcomes are filtered out at both server boundaries: Gift
  recommendations and Conversation Brain.
- The operation requires an owned, canonical, given Gift with an explicit
  outcome; RLS remains the final ownership boundary.
- Changing the flag invalidates cached recommendations for the affected Person.

## Person feedback audit

- The Person profile shows all explicit Gift outcomes in one compact audit.
- It separates outcomes currently used by recommendations and Conversation Brain
  from outcomes retained in history only.
- Each row includes the exact Gift, reaction, confirmation date, optional note,
  and a direct learning switch.
- Updating the switch reuses the same authenticated, owner-scoped persistence
  operation and refreshes both the Gift workspace and Person profile.

## Aggregate feedback safeguards

- One outcome remains evidence about that exact Gift, not a lasting category
  preference or prohibition.
- Stable category learning requires at least two matching confirmations and no
  opposite confirmed reaction.
- `unsure`, unknown categories, and conflicted history never produce a stable
  generalized signal.
- Recommendation ordering and Conversation Brain share the same deterministic
  projection, so AI cannot promote weak evidence on its own.

## Direct per-outcome control inside the AI preview

- Every visible preview item has a `Do not use in AI` action.
- The action disables the existing per-Gift learning preference; it does not
  delete the reaction, note, Gift, or Person timeline entry.
- The item disappears from the exact AI projection after the owner-scoped
  refresh and remains visible in the complete private-history audit below.
- A user can enable it again with the existing switch in that audit.
- The safe preview and copied export remain ID-free; the React control pairs the
  visible bounded projection with its local source only to perform the update.

## Bounded undo for accidental exclusion

- A successful exclusion shows an accessible confirmation naming the Gift and
  confirming that its history was retained.
- The confirmation offers Undo for eight seconds and then dismisses locally;
  no timer or transient notification is persisted in Supabase.
- Undo explicitly re-enables only the same Gift outcome through the existing
  owner-scoped update path and refreshes the exact AI preview.
- Failed Undo remains visible as an error and never assumes consent was restored.

## Permanent history-only audit filter

- The complete audit exposes accessible `All` and `History only` controls with
  live counts derived from the already loaded owner-scoped ViewModel.
- `History only` shows every outcome that is currently ineligible for AI,
  including both per-Gift exclusion and a profile-wide consent restriction.
- Existing per-Gift switches remain available inside the filtered results, so a
  deliberately excluded outcome can be restored after the Undo window closes.
- Filtering is local and creates no query, migration, tracking event, or stored
  preference in Supabase.

## Effective-consent reason inside History only

- Every history-only card now explains whether AI use is blocked by the global
  profile preference or by the individual Gift preference.
- Profile-wide restrictions use an amber callout and link to profile AI
  settings because changing only the Gift switch cannot restore effective use.
- Individual exclusions use a neutral callout and explain that the adjacent
  per-Gift switch is the correct restoration control.
- The distinction is derived from the already loaded effective consent state;
  no private content, new query, or database column is introduced.

## Compact effective-consent breakdown

- The audit header shows compact counts for outcomes affected by the global
  profile setting and outcomes explicitly excluded at Gift level.
- Counts are derived from the already loaded ViewModel and reveal no Gift title,
  reaction, note, identifier, or other Person data.
- When both reasons apply, the UI explicitly explains that the counts overlap:
  individual exclusions are included in the profile-wide affected total.
- Zero-value reason badges stay hidden, keeping the summary compact.

## One-action restoration from History only

- Individually excluded cards expose a visible `Allow AI` button next to the
  reason explanation, with a Gift-specific accessible label.
- The button delegates to the same per-Gift change handler as the existing
  switch; there is no second state or persistence path to drift out of sync.
- The shortcut is hidden when profile-wide consent is disabled, because a
  per-Gift action alone cannot restore effective AI eligibility in that state.
- Busy and failure behavior is shared with the existing owner-scoped control.

## Restoration confirmation and empty-filter recovery

- A successful effective restoration shows an accessible confirmation naming
  the Gift for eight seconds.
- When the restored outcome was the final History-only item, the audit switches
  back to `All` and explains why, instead of leaving an empty filtered screen.
- Restoration confirmation is shown only when profile consent allows the Gift
  to become AI-eligible; changing a per-Gift preference under a global block
  never produces a misleading success message.
- The transient confirmation and filter transition remain local UI state.

## Effective Used-by-AI filter

- The audit now exposes `All`, `Used by AI`, and `History only` as one accessible
  segmented control with live counts.
- `Used by AI` filters on effective `aiEligible`, so both profile-wide and
  per-Gift consent must be active; a local switch alone is never treated as use.
- The compact three-column control supports wrapped localized labels and
  exposes pressed state to assistive technology.
- An AI-specific empty state explains when no Gift outcome is currently used.

## Used-by-AI evidence summary

- The Used-by-AI view now separates active outcomes with a user note from
  reaction-only evidence in a compact accessible summary.
- Counts use effective `aiEligible` consent and normalized non-empty notes, so
  disabled outcomes never appear in either number.
- The summary exposes only aggregate counts. It does not render note contents,
  Gift titles, identifiers, or any new database-backed information.
- Zero counts remain visible when the view contains active evidence, making the
  composition explicit instead of silently hiding one category.
- Supporting copy explains that an explicit reaction is useful evidence on its
  own, while an optional note adds detail about what worked or did not fit.
- The explanation avoids pressuring the user to disclose more information and
  never presents a note as a requirement for useful personalization.

## Direct optional context action

- Reaction-only cards in the Used-by-AI view now expose a visible `Add context`
  action with a Gift-specific accessible label.
- The action opens the existing outcome editor with the confirmed reaction
  preserved and the optional note ready to complete.
- It reuses the canonical owner-scoped confirmation operation; there is no new
  persistence path, API, database field, or implicit AI-generated note.
- The shortcut is hidden for outcomes that already have a note and while that
  card's editor is open, avoiding duplicate calls to action.

## Direct context focus

- Activating `Add context` opens the existing editor and moves keyboard and
  screen-reader focus directly to that Gift's note field after it mounts.
- Focus intent is stored in a local ref for one render only and is cleared after
  use, so it cannot unexpectedly refocus during typing or a later refresh.
- Opening the same editor through the general pencil action preserves its normal
  control order, starting with the reaction choices rather than skipping them.
- The behavior adds no persistence, analytics, browser permission, or database
  interaction.

## Cancel focus restoration

- The editor records whether it was opened by `Add context` or the general edit
  control for that exact Gift.
- Cancelling closes the editor and restores focus to the originating control
  after the collapsed card has rendered.
- A successful save clears the origin without scheduling focus restoration, so
  canonical refresh and updated card content retain their natural focus flow.
- Origin and pending focus state stay in transient refs and never enter user
  data, analytics, URLs, or Supabase.

## Context enrichment confirmation

- Saving a non-empty note from the direct `Add context` flow produces an
  accessible polite confirmation for eight seconds.
- The message identifies the Gift but never repeats the private note text and
  says only that Happy can consider it in future interactions.
- General edits and empty-note saves do not trigger the confirmation, avoiding
  a false claim that new context was added.
- The transient message is shown only after canonical persistence and refresh
  succeed; it is not stored or tracked separately.

## Confirmation-to-preview path

- The context confirmation remains above the filtered audit after refresh, so a
  card update cannot remove the success state prematurely.
- Its `View AI context` action opens the existing canonical, bounded preview;
  it does not construct a second projection or reveal additional fields.
- Both preview controls expose expanded state and reference the same controlled
  region for assistive technology.
- Opening the preview does not dismiss the eight-second confirmation early and
  performs no new network or persistence operation.

## Confirmation preview focus

- Launching the AI context from the success confirmation moves focus to the
  controlled preview region after it opens.
- If the preview is already open, the same action focuses it immediately rather
  than relying on a state change that will not occur.
- The preview region is programmatically focusable and retains a visible focus
  indicator without adding it to the ordinary Tab sequence.
- The standard disclosure toggle keeps its original behavior and never moves
  focus away from the control the user deliberately activated.

## Explicit preview close and focus return

- The focused AI preview now includes a localized `Close AI context` action.
- Closing returns focus to the exact opener: either the success-confirmation
  action or the standard disclosure control.
- If the eight-second confirmation has already disappeared, the persistent
  disclosure control becomes the safe focus fallback.
- Opening through the ordinary disclosure still keeps focus on that control;
  only the explicit close action schedules focus restoration.

## Escape support inside the preview

- Pressing Escape while focus is anywhere inside the AI preview closes it
  through the same explicit close-and-focus-return path.
- Other keys are ignored, preserving normal keyboard use of links, buttons, and
  the copy action inside the region.
- The handled Escape event is prevented and stopped so an ancestor cannot also
  close an unrelated interface layer.
- The preview remains an inline disclosure: it has no dialog role, aria-modal
  state, focus trap, or modal semantics.

## Named inline AI context region

- The focused AI preview is now an inline `region` named by a visible localized
  heading through `aria-labelledby`.
- Assistive technology receives the region purpose before the existing bounded
  record-count description and preview contents.
- The heading reuses the canonical preview title in every supported locale;
  there is no parallel accessibility-only translation to drift out of sync.
- Region semantics do not introduce modal behavior, a focus trap, or an
  `aria-modal` state.

## Local Escape guidance

- The open preview shows a short localized instruction that Escape closes the
  region.
- `aria-describedby` connects the focused region to that helper, so assistive
  technology announces the available shortcut after the region name.
- The helper exists only while the preview is rendered and is not attached to
  either collapsed disclosure control.
- All five supported locales share the same translation key and the existing
  locale-parity tests protect it from silent drift.

## Ordered preview description

- The focused region's `aria-describedby` now references both the local Escape
  helper and the live bounded record-count description.
- ID reference order is deliberate: assistive technology receives the keyboard
  shortcut first and the current AI data scope second.
- The scope uses the canonical preview length and the existing locale-aware ICU
  plural message, so visible and announced counts cannot diverge.
- No hidden database total or excluded History-only outcome enters this count.

## Visible bounded-context limit

- When more than ten outcomes are effectively AI-eligible, the open preview
  explains that its shared context includes the ten newest available outcomes.
- The notice imports the same `GIFT_OUTCOME_AI_CONTEXT_LIMIT` constant used by
  the canonical projector; UI copy cannot silently drift from runtime behavior.
- `total` is the already loaded effective-consent count, while `shown` is the
  fixed bounded projection cap. History-only outcomes are excluded from both.
- The notice stays hidden at or below the cap, avoiding unnecessary privacy
  copy when every eligible outcome already fits.

## Older outcome retention clarity

- The bounded-context notice now explicitly says that older eligible outcomes
  remain in the user's private Gift history and are not deleted.
- It distinguishes retention from current AI use: preserved history outside the
  newest ten does not enter this bounded context.
- The clarification appears only when truncation actually occurs and never
  exposes the titles, notes, identifiers, or reactions of omitted outcomes.
- This is explanatory UI only; no retention policy, consent setting, query, or
  Supabase row changes.

## Exact older-outcome count

- The retention clarification now states the exact number of older eligible
  outcomes outside the current AI context.
- The value is derived locally as `max(0, activeCount - sharedLimit)` and cannot
  become negative when history is below the cap.
- ICU plural messages provide grammatically appropriate singular and plural
  copy in Ukrainian, English, Polish, Russian, and German.
- No omitted outcome content is loaded or rendered beyond the already available
  owner-scoped audit ViewModel.

## Aggregate export limit footer

- The local plain-text export now appends a localized privacy footer when older
  eligible outcomes sit outside the bounded context.
- The formatter receives only `omittedCount`; omitted Gift titles, reactions,
  notes, categories, identifiers, and dates never cross its input boundary.
- Missing, negative, or fractional values are normalized to a non-negative
  integer, and zero produces no footer.
- The footer uses the same locally derived count as the visible limit notice and
  is copied through the browser Clipboard API without a network request.

## Self-explanatory export scope

- The local export footer now states the actual projected record count and the
  shared system maximum alongside the omitted count.
- Actual size is computed after canonical normalization, so malformed or empty
  entries cannot make the exported count overstate the visible content.
- Maximum comes directly from `GIFT_OUTCOME_AI_CONTEXT_LIMIT`; callers provide
  neither value and therefore cannot create contradictory export metadata.
- A copied audit remains understandable outside HappyDate while still exposing
  no content from omitted older outcomes.

## Local export generation time

- The copied AI-context audit includes an explicitly labeled generation date
  and time; it is not presented as an outcome, gift, or event date.
- The active HappyDate locale controls date formatting, while the device's IANA
  timezone is resolved locally at the moment the user copies the export.
- The formatter requires an explicit `Date`, locale, and timezone. This keeps
  output deterministic in tests and prevents server time from being mistaken
  for the user's local time.
- Invalid timestamps and timezone identifiers fail closed instead of producing
  misleading audit metadata.

## Verifiable preview generation time

- Opening the safe AI-context preview now fixes and displays its local
  generation time and device timezone before Clipboard access.
- Copying reuses that exact timestamp instead of sampling a later time, so the
  visible preview and copied audit cannot contradict one another.
- Closing and reopening the preview creates a fresh timestamp; merely copying
  an already open preview does not silently change its metadata.
- The preview and exporter share one date formatter and localized label.

## Explicit preview-time refresh

- The open preview includes a compact localized action that deliberately
  refreshes its generation time and device timezone without closing the region.
- Refreshing preserves keyboard focus and resets a previous Copy success state,
  making it clear that the newly prepared version has not yet been copied.
- The next Copy action consumes the refreshed metadata, maintaining exact
  agreement between visible and Clipboard versions.

## Accessible refresh confirmation

- A successful metadata refresh is announced through a polite, screen-reader-
  only status without moving keyboard focus.
- The confirmation includes the exact refreshed local date, time, and timezone,
  so it communicates the result rather than only the action.
- Opening a new preview clears the prior announcement and prevents stale status
  from being read as a new refresh.

## Contextual refresh action name

- The compact visible Refresh label now has a localized accessible name that
  includes the currently displayed export date, time, and timezone.
- The name is derived from the same fixed preview metadata and shared formatter
  as the adjacent timestamp, preventing contradictory pre-action information.
- After refresh, React updates both the visible timestamp and the action name to
  the newly prepared export time.

## Contextual Copy action name

- The Copy action has a localized accessible name that identifies the exact
  prepared export date, time, and timezone it will place on the Clipboard.
- Its compact visible label remains unchanged, while the decorative Copy icon
  is hidden from assistive technology.
- Refreshing metadata updates the Copy action name from the same preview state,
  keeping the pre-action promise aligned with the exported timestamp.

## Exact post-Copy confirmation

- Clipboard success now stores and announces the exact timestamp and timezone
  that were used to build the text after the write succeeds.
- Failed writes clear prior copied metadata, preventing an old success message
  from being presented for a new failed attempt.
- Refreshing or reopening the preview clears stale Copy state because the newly
  prepared version has not yet reached the Clipboard.
- The localized confirmation retains the local-device-only privacy explanation.

## Compact visible Copy time

- After a successful Clipboard write, the Copy button visibly includes the
  short localized time of the version that was actually copied.
- A dedicated shared formatter derives that time from the stored successful
  metadata and its timezone; it does not sample the clock again.
- The detailed status below continues to provide the complete date and timezone,
  keeping the button compact on mobile layouts.

## Bounded asynchronous Copy state

- Copy enters an explicit transient state before Clipboard access and rejects
  repeated activation until that asynchronous write settles.
- The button is disabled, exposes `aria-busy`, shows a localized Copying label,
  and replaces its decorative icon with a visible loading indicator.
- Success and error remain mutually exclusive terminal states, and copied
  metadata is stored only after the Clipboard promise resolves successfully.

## Stable Clipboard transaction boundary

- While Clipboard writing is active, Refresh, explicit Close, the disclosure
  toggle, and Escape closing cannot replace or dismiss the prepared preview.
- Both event-handler guards and native disabled controls enforce the boundary;
  keyboard and pointer users receive equivalent behavior.
- Every control is restored automatically when the Copy promise resolves or
  rejects, without changing the successful or error feedback paths.

## Stable preview records during Copy

- Per-record AI-context exclusion is disabled while Clipboard writing is active,
  preventing the visible preview list from mutating mid-transaction.
- The exclusion handler independently rejects the same overlap, covering
  programmatic activation in addition to the native disabled button.
- Existing Gift mutation loading behavior remains intact and composes with the
  Clipboard boundary rather than replacing it.

## Explained Copy lock

- While Copy is active, the preview displays one concise localized explanation
  of why Refresh, per-record exclusion, and Close are temporarily unavailable.
- The explanation is a polite live status, making the transaction boundary
  understandable to screen-reader users without moving focus.
- It exists only during the pending Clipboard promise and disappears with either
  success or failure.

## Bounded Clipboard timeout

- Clipboard writing races against an explicit ten-second timeout, and its timer
  is always cleared when either path settles.
- Timeout has a distinct UI state and localized alert, releases every temporary
  control lock, and never records the prepared version as successfully copied.
- Because the Web Clipboard API cannot be aborted, the alert honestly asks the
  user to inspect the Clipboard before retrying; it does not claim the delayed
  browser operation was cancelled.

## Safe ordinary-error retry

- Ordinary Clipboard failures expose a localized one-tap Retry action inside
  their alert and reuse the same prepared preview, timestamp, formatter, timeout,
  and transaction locks.
- Retry remains absent from the timeout alert because that browser operation may
  still complete after HappyDate releases its local lock.
- Activating Retry keeps focus on the same control while the error alert is
  replaced by the standard Copying state.

## Contextual Retry action name

- The compact visible Retry label now has a localized accessible name containing
  the exact prepared export date, time, and timezone.
- It derives from the same fixed preview metadata and formatter as primary Copy,
  so both actions promise the same payload before activation.
- The fallback label remains safe if metadata is unexpectedly unavailable.

## Complete keyboard Retry recovery

- An ordinary Clipboard failure marks a pending focus transfer and moves focus
  to the newly rendered Retry action after React commits it.
- Retry failures repeat that same recovery; successful Retry returns focus to
  the persistent primary Copy button and clears the retry-origin marker.
- Timeout clears the marker and does not impersonate an ordinary retryable
  failure, preserving its deliberately manual recovery contract.

## Timed-out Retry focus recovery

- A timeout remembers whether the attempt originated from Retry before clearing
  the retry marker.
- Only a timed-out Retry schedules focus back to the persistent primary Copy
  button after the timeout alert renders; an initial Copy timeout causes no
  unnecessary focus movement.
- The user lands at a stable control from which the adjacent uncertainty alert
  can be reviewed before any deliberate next action.

## Timeout guidance association

- While timeout guidance is present, primary Copy references its exact alert
  through `aria-describedby`; the association disappears with the timeout state.
- Returning focus after a timed-out Retry therefore exposes both the stable Copy
  action and the browser-outcome uncertainty guidance again.
- Superseded generic Copy success strings were removed from every locale; only
  the exact timestamped success contract remains.

## Clipboard and safe-export module complete

The local AI-context preview/export flow is now complete: bounded projection,
consent-aware records, exact localized metadata, local-only Clipboard writing,
transaction locks, timeout honesty, ordinary-error Retry, and full keyboard and
screen-reader recovery are covered by the shared implementation and regression
tests. Further work should move to the next product capability rather than add
more micro-states to this control.

## Next major stage

Define and implement the first person-centered Memory Brain ingestion flow that
turns an explicitly user-confirmed note into structured, source-linked knowledge
without allowing AI inference to become stored fact.

## Local plain-text AI context export

- A Copy action appears only when the safe preview contains at least one item.
- Export text is generated from the already projected five visible fields and
  localized labels; it cannot access hidden Gift, Person, User, or confirmation
  identifiers.
- Copying uses the browser Clipboard API only. It performs no network request,
  creates no Supabase row, and shows separate success and failure feedback.
- The pure export formatter is tested independently so support text remains
  bounded by the same preview projection even if its caller changes later.

## Exact AI context preview

- The feedback audit exposes a collapsible preview of the exact Gift outcome
  field projection eligible for Happy chat and recommendations.
- A shared pure projection now powers both the server Conversation Brain
  formatter and the profile preview: Gift title, explicit reaction, bounded
  note, category, and conservative category signal.
- The projection caps input at ten outcomes, normalizes titles to 240 characters
  and notes to 500, and contains no Gift, Person, or User IDs.
- Profile-wide and per-Gift consent are applied before projection. When consent
  blocks every outcome, the preview explains that no Gift outcome context will
  be provided to AI.

## Effective AI consent for reaction notes

- Person Profile now loads the owner-filtered profile-level Gift outcome
  learning preference alongside canonical Gifts and Knowledge.
- Every confirmed outcome exposes an effective `aiEligible` state requiring
  both profile-level consent and the per-Gift learning switch.
- The audit explains separately when a note can support Happy chat and
  recommendations, when the Gift switch keeps it history-only, and when the
  profile-wide preference disables all Gift outcome learning.
- The per-Gift switch remains visible even when global consent is disabled, but
  the item is not counted or styled as AI-active. A direct link lets the user
  review the profile-wide setting.

## Reaction notes in Person history

- A canonical given-Gift Timeline entry now includes its explicit reaction and
  optional note, keeping the emotional result next to the event it describes.
- The feedback audit presents a direct Edit action for the three-state reaction
  and its bounded note; users no longer need to locate the same Gift inside the
  larger management workspace.
- Editing reuses the existing authenticated owner-scoped outcome operation and
  the database-managed confirmation timestamp. No duplicate Knowledge or Memory
  record is created.
- Timeline and audit are projections of the same canonical Gift fields, so an
  edit refreshes both views and cannot create contradictory copies.

## Optional note after a direct Home answer

- The explicit outcome is saved first. The confirmation then offers an optional
  note, so writing context never blocks or weakens the primary answer.
- Opening the note editor stops the eight-second dismissal timer. The user can
  write up to 500 characters, save, or choose Not now.
- Note persistence requires the same Gift ID, authenticated owner, `given`
  lifecycle, and exact current reaction. A stale editor therefore cannot attach
  text after the reaction was changed elsewhere.
- Client and repository validation both require non-empty normalized text within
  the existing database limit. A failed note save leaves the editor and text
  visible while making clear that the outcome itself was already saved.

## Direct Home answer confirmation and undo

- A successfully saved Home answer remains visible for eight seconds in an
  accessible confirmation with the exact selected value and an Undo action.
- Undo uses the same authenticated, owner-filtered canonical persistence path.
  It applies only to a `given` Gift with an existing explicit reaction.
- The existing database trigger clears the confirmation timestamp and note,
  resets learning eligibility safely, and makes the follow-up question eligible
  again; no new schema state or inferred history is introduced.
- If Undo fails, the confirmation stays visible, its automatic timeout stops,
  and a localized error lets the user retry instead of falsely claiming success.

## Direct Home outcome answer

- The post-gift Home card offers exactly three explicit answers: `liked`,
  `not_liked`, and `unsure`. Happy never infers one from silence or other data.
- The action reuses the canonical owner-scoped persistence path and remains
  limited to Gifts whose lifecycle is `given`; the database sets the confirmed
  timestamp through the existing trigger.
- While a save is in progress, every answer and follow-up action is disabled to
  prevent conflicting double taps. A failed save keeps the card visible and
  presents a localized retry message.
- After success, Home reloads its canonical projection. The answered Gift no
  longer matches the pending follow-up query, so the card disappears naturally.
- Snooze and dismiss remain separate controls and never become recipient
  feedback.

## Visible learning strength

- Every confirmed reaction in the Person feedback audit shows whether it is an
  exact experience, part of a stable preference, part of a stable avoidance,
  conflicted with other feedback, or excluded from learning.
- The profile ViewModel uses the same aggregate signal builder as Gift
  recommendations and Conversation Brain; the React component only presents it.
- Only learning-enabled outcomes participate in aggregate strength. Turning one
  off immediately re-projects every affected status without deleting history.
- All labels are localized in Ukrainian, English, Polish, Russian, and German.

## Post-gift follow-up

- Home loads only owned canonical Gifts marked `given` with no explicit
  recipient reaction and offers one newest question at a time.
- The recommendation links directly to the Person Gift Workspace, where the
  user chooses `liked`, `not_liked`, or `unsure` and may add a note.
- Once an answer is stored, the Gift no longer matches the repository filter,
  so the question disappears without a separate inferred completion state.
- Additional pending Gifts remain queued instead of producing multiple prompts.
- Query filters duplicate the RLS ownership boundary and select only the fields
  required for the Home prompt.

## Post-gift question in the voice briefing

- The newest currently due Gift outcome question is added as a dedicated
  `post-gift-question` section in the detailed briefing only.
- Short mode continues to include only greeting, today, and upcoming timing.
- A pending post-gift question suppresses preparation-time care questions, so a
  detailed briefing asks at most one question.
- Snoozed, dismissed, and already answered Gifts are removed by the Home
  Repository before briefing construction.
- Spoken copy is neutral about who physically gave the Gift and uses only the
  stored Person name and bounded Gift title.

## Memory Brain: confirmed-source provenance

- Happy Learning remains proposal-only: no detected fact enters Knowledge until
  the authenticated owner explicitly confirms the token-bound candidate.
- Confirmed rows retain the exact reviewed excerpt, stable candidate ID,
  capture-schema version, source kind, and confirmation time. Legacy and manual
  memories remain readable without fabricated confirmation metadata.
- A database unique index on owner, source kind, and source candidate prevents
  concurrent or repeated confirmations from creating duplicate facts. The
  repository resolves a uniqueness race back to the already-created row.
- Existing owner-scoped Memory RLS and linked Person/Event ownership checks
  continue to protect all new columns; no public or anonymous grant was added.
- Person Profile marks structured facts that were explicitly “Confirmed by
  you” in all five supported locales, so provenance is visible rather than only
  stored internally.
- Migration `20260809170345_add_memory_brain_provenance.sql` is applied to the
  linked Supabase project. The next Memory Brain package is source-level review:
  inspect the exact excerpt and archive or correct confirmed knowledge safely.

## Memory Brain: source review and correction

- Confirmed preferences, interests, dislikes, and facts in Person Profile expose
  an optional source audit with the exact user-reviewed excerpt, capture channel,
  and localized confirmation date.
- A correction updates only the structured value used by HappyDate. The original
  excerpt, source candidate, schema version, and confirmation timestamp remain
  unchanged so the audit trail cannot be silently rewritten.
- “Stop using” is a two-step action. It archives instead of deleting the record;
  archived Knowledge is immediately excluded from visible Person knowledge,
  Brain insights, reminders, recommendations, and AI context.
- Both mutations require the authenticated user ID and exact Person ID, Knowledge
  ID, and active state in addition to database RLS. A forged or stale profile
  action cannot mutate another Person’s record.
- Empty and over-500-character corrections are rejected on both interface and
  repository boundaries. Failure keeps the source audit open and reports a
  localized retry message.
- The next Memory Brain package is archived-knowledge management: a private
  history view with explicit restore and permanent-delete boundaries.

## Memory Brain: private archive

- Person Profile loads archived Knowledge only after ownership of the Person is
  verified. The archive starts collapsed and clearly states that its records do
  not influence HappyDate.
- Restore accepts only an archived row matching the authenticated owner, Person,
  and Knowledge ID. After refresh, the fact returns to its canonical category
  and may participate in Brain and AI again.
- Permanent deletion is a distinct two-step destructive action. It can target
  only an already archived row and shows an explicit irreversible warning; an
  active fact cannot be deleted through this path.
- Failed restore or deletion leaves the item visible and reports a localized
  retry message. No optimistic UI claims success before Supabase confirms it.
- Archive copy and actions are available in Ukrainian, English, Polish, Russian,
  and German. No database migration was needed because lifecycle already uses
  the canonical `memories.is_active` state protected by existing RLS.
- The next Memory Brain package is correction history: retain each confirmed
  value change as an audit event instead of only preserving the original source.
