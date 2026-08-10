# HappyDate design roadmap

## Product design direction

HappyDate is a calm care assistant, not a dense productivity dashboard. Every screen should answer one primary question, make one recommended action obvious, and keep the person — rather than the event — at the center.

The shared visual language is intentionally light, warm and modern: airy canvas, white surfaces, sky-blue actions, restrained pink accents, generous rounded corners, clear typography and touch targets of at least 44 px. Emotional color is reserved for meaning, not decoration.

## Shared screen anatomy

1. Context: greeting, back action or page title.
2. Answer: the most important information right now.
3. Action: one primary next step.
4. Supporting content: lists, history and secondary controls.
5. Feedback: visible loading, empty, success and error states.

## Delivery packages

### Package 1 — foundation and settings

- Shared canvas, surfaces, typography, spacing, color and accessibility tokens.
- Reusable page and settings shells.
- Reminder settings and account export migrated to the shared system.
- Light color scheme made explicit until a complete dark theme exists.

### Package 2 — core daily experience

- Home/dashboard: one personalized answer, daily audio briefing and nearest action.
- People list: search, relationship filters, upcoming dates and care indicators.
- Person profile: unified timeline for events, memories, notes, gifts and links.
- Calendar: month/week focus, color legend and one-tap event creation.
- Notes: strong search, person/event filters and quick text, voice and photo capture.
- Profile: simplify hierarchy and remove competing card styles.

### Package 3 — capture and intelligence

- Add person and contact import.
- Add/edit note, memory and event flows.
- Care center and memory confirmation questions.
- Gift assistant entry, chat context and saved gift links.
- Consistent permission, offline, empty and failure states.

### Package 4 — onboarding and trust

- Login, registration, password reset and callback states.
- Survey/onboarding focused on value before data collection.
- Privacy explanations at the moment sensitive data is requested.
- Notification, microphone, camera and contacts permission education.

### Package 5 — public and commercial surfaces

- Marketing home, about, reviews and services index.
- Individual service and order pages.
- Privacy, terms and refund policy readability.
- Shared public header/footer and coherent conversion actions.

## Quality gate for every page

- Mobile first at 390 px, then tablet and desktop.
- Ukrainian, Polish and English content must not break layout.
- Keyboard focus, labels, contrast and reduced motion supported.
- Loading, empty, error, offline and completed states designed.
- No dead controls or links to routes that do not exist.
- Visual browser review plus TypeScript, tests and production build.
