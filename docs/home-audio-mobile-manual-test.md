# Home audio — mobile lifecycle checklist

Run this checklist on at least one supported iPhone and one supported Android
device after installing a native build.

1. Start a detailed briefing and verify that the waveform and progress appear.
2. Lock the screen, wait five seconds and return. The app must not resume speech
   without a user action; it should remain paused or report an interruption.
3. Start again, send the app to the background and return. Confirm the same
   behavior and that only one voice session exists.
4. During playback, receive or simulate a phone/audio interruption. After
   returning, confirm that the UI is not stuck in a playing state. If the OS
   cancelled speech, the localized interruption message must be visible.
5. Pause manually, background and return. The briefing must remain paused.
6. Switch short/detailed mode after return. Confirm old speech is cancelled
   before the new mode starts.
7. Navigate away during playback and return to Home. No previous voice may
   continue or overlap a new briefing.
8. Repeat with Reduce Motion enabled. The waveform must remain static.

Web Speech does not guarantee true background playback on iOS or Android. This
release intentionally pauses or invalidates the session instead of presenting
unreliable background audio as supported.
