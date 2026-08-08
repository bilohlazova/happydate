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

## Next slice

Refresh the Gift Workspace immediately after a saved recommendation and expose
the saved idea in the Person timeline without requiring a page reload.
