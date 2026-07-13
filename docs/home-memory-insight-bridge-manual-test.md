# Home Memory Insight bridge — manual scenario

Use an authenticated account with a person named Olek whose next birthday is
five days away. Start the Home morning briefing after each data change.

1. With active Olek-linked `coffee: kawa speciality` and
   `hobby: fotografia` records, verify the existing birthday card remains and
   exactly one secondary card says `Happy ma punkt wyjścia dla Olka`. Its
   action must open `/people/{Olek id}`.
2. Add an active Olek-linked gift with `value_text: Album fotograficzny`.
   Verify the birthday card remains and the secondary card changes to the
   saved-gift copy. The context card must no longer appear.
3. Remove the gift and both context records. Verify the birthday card remains
   and exactly one missing-context recommendation appears.
4. Add a journal containing a unique test phrase and repeat the briefing.
   Verify that phrase appears in neither card text nor browser logs.

If no supported canonical insight is produced, the pre-bridge Home cards must
remain unchanged. A recommendation failure must also leave the primary cards
visible and may emit only the generic development warning
`[happy.brain] Memory recommendation unavailable.`
