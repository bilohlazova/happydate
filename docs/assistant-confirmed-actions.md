# Assistant confirmed actions

Happy may help a user reach an action, but it does not silently mutate the
user's calendar or relationship memory.

## Current actions

- **Capture knowledge:** a chat message may produce a bounded Happy Learning
  candidate. Persistence requires the visible confirmation card and a signed,
  server-verified detection token.
- **Add an event:** the Assistant action navigates to
  `/dashboard?action=add-event`. Calendar consumes the intent once, removes it
  from the URL and opens an empty editable draft. The Add button remains
  disabled until the required title and date are present. Only the calendar's
  explicit Add action calls event persistence.
  When the conversation has one unambiguous active person, the Assistant may
  carry that identifier as a suggestion. Calendar accepts it only after the
  person appears in the current user's owner-scoped People result.
- **Add a note:** the Assistant action navigates to
  `/notes?action=add-note`. Notes consumes the intent once, removes it from the
  URL and opens a new empty Note draft. Only an explicit Save action in the
  Notes-owned editor can persist it; cancelling leaves Knowledge unchanged. If
  the conversation has one unambiguous active person, their identifier is
  carried as a suggestion and accepted only after Notes finds it in the
  current user's owner-scoped People result.
- **Open People or the active Person profile:** these are navigation only and
  have no mutation authority. The profile link is rendered only for a person
  resolved from the current user's owner-scoped Assistant context.
- **Gift and inspiration:** these remain conversational prompts. When one
  active person is resolved, the Gift prompt uses their displayed name. If a
  user selects the Gift action with that unambiguous person context, Happy
  navigates to the person's owner-scoped Gift workspace, consumes the
  `add-gift-idea` intent and focuses an empty idea editor. No generated chat
  text is copied into the draft and only the explicit Add button may persist
  the idea. Without a resolved person the action remains a conversational
  prompt. If a
  completed Assistant response contains a valid HTTPS link, Happy shows an
  explicit **Save for {person}** control. Only pressing that control calls the
  canonical Gift repository; user-message links, malformed URLs, streaming
  text and links without an unambiguous active person cannot be saved from
  chat. The saved link then appears in that person's Gift workspace.
  In later person-scoped conversations, Happy receives at most eight of that
  person's most recent saved HTTPS candidates through a server-verified,
  owner-filtered boundary. Preferred remains a shortlist decision: the prompt
  explicitly forbids treating any saved link as ordered, purchased, delivered,
  given or liked.
  Chat uses an idempotent save adapter: before creating an unassigned link it
  compares the canonical HTTPS URL with that person's existing saved links.
  Repeated responses and later confirmation clicks therefore reuse the saved
  state instead of intentionally creating another row.
  After a successful or already-saved result, the confirmation exposes a
  direct person-profile link carrying the owner-verified saved-link ID;
  navigation closes the Assistant, resolves that ID inside the loaded
  person-owned Gift workspace, scrolls to the matching card, highlights it and
  moves keyboard focus there. If no exact target is available, navigation
  safely falls back to `#gift-workspace`.

## Invariants

1. Conversation output is never database authority.
2. Navigation is not confirmation of persistence.
3. Every write names its owning domain and passes that domain's authorization
   and validation boundary.
4. Happy may claim that something was saved only after persistence succeeds.
5. Canceling a draft must leave the underlying domain unchanged.

## Runtime verification

The authenticated local flow was verified on 2026-08-16:

1. Home opened Happy.
2. The visible **Add event** action navigated to Calendar.
3. Calendar removed the action query parameter and opened **New event**.
4. The title field received focus, the title remained empty and Add was
   disabled.
5. Cancel closed the draft without submission.
6. The browser console contained no warnings or errors during the flow.

Automated coverage lives in `tests/assistant-confirmed-actions.test.mjs`.
