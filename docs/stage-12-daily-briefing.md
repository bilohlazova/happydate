# Stage 12 — Personalized daily briefing

- Status: Complete (12.1–12.4)
- Date: 2026-08-08
- Product goal: a trustworthy, useful briefing the user can listen to while moving

## Stage 12.1 — Structured, person-aware briefing

Home no longer builds audio copy from only an insight count and one event. A
dedicated deterministic builder now returns structured sections for greeting,
today, the next important event, confirmed Person context and an optional care
offer. Every section carries source identifiers so later UI, analytics and AI
work can explain why it was included.

The briefing uses the user's chosen/profile name, distinguishes today's events
from future events and can mention one saved gift idea or preference for the
Person linked to the featured Event. It describes a gift only as a saved idea;
it never claims that it was bought, delivered or liked. Journals, inactive
records and AI-ineligible Knowledge cannot enter the Home projection.

Long user-entered values are normalized and bounded before speech. Copy is
available in all five supported locales. The existing Web Speech playback now
receives this richer structured projection without adding another data query
or AI call.

## Stage 12.2 — Accessible audio player

The Home briefing control now has explicit playing, paused and stopped states.
Users can pause and resume the current Web Speech session without restarting
the briefing, stop it deliberately, reveal the exact spoken text at any time
and see progress across safely split speech chunks.

While audio is active, Home displays a moving waveform and a semantic progress
bar. The waveform freezes while paused and becomes static when the operating
system requests reduced motion. All player state and controls have localized
labels in the five supported languages. Playback cancellation on unmount and
the existing iOS/WKWebView delay remain intact.

## Stage 12.3 — Briefing modes and care-question timing

Users can choose a short briefing containing only greeting, today and the next
event, or a detailed briefing that also includes confirmed Person context and
one timely care prompt. The preference is stored locally on the device with a
safe session fallback when storage is unavailable. Switching modes stops the
current speech before changing its text, so playback never mixes two variants.

Care questions are deterministic and limited to one per briefing. Within 14
days of an important Person event, missing gift context may trigger an offer to
help choose a gift. Between 15 and 30 days, missing preference context may
trigger one small question while there is still comfortable preparation time.
Outside these windows Happy stays quiet. A saved gift idea produces an offer,
not another data-gathering question, and remains explicitly an idea rather than
a claimed purchase.

## Stage 12.4 — Mobile lifecycle resilience

The Web Speech player now reacts to mobile WebView lifecycle signals. Moving
the app to the background automatically pauses an active briefing and returning
never resumes it without the user's action. Page suspension invalidates the
active session. Native/browser `interrupted` speech errors and silent OS
cancellation are reflected as a localized interruption state instead of
leaving the waveform in a false playing state.

The implementation deliberately does not claim reliable background playback:
Web Speech cannot guarantee it on iOS or Android without a generated audio file
and native audio session. A device checklist covers screen locking, app
backgrounding, calls/audio interruptions, manual pause, navigation, mode
switching and Reduce Motion. Stage 12 is complete at this honest Web Speech
boundary; generated/native background audio would be a separate future stage.
