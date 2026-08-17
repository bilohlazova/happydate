# HappyDate native privacy disclosure baseline

Audit date: 2026-08-16. This document maps implemented product behavior to the
store disclosures that must be reviewed immediately before every submission.
It is an engineering baseline, not a substitute for the answers entered in App
Store Connect or Google Play Console.

## Current principles

- HappyDate does not use user data for tracking or third-party advertising.
- Data is linked to the authenticated account because it is stored in
  owner-scoped Supabase records or private Storage objects.
- The current purpose for every listed category is app functionality: account
  access, remembering important people, events, notes, gifts and reminders.
- Optional device access is requested at the moment the user chooses the
  corresponding action; selected contacts are imported rather than the whole
  address book.
- Local-only processing is not described as collection unless its result is
  transmitted and retained.

## Store disclosure matrix

| Product data | Apple privacy category | Google Play category | Linked to account | Why retained |
| --- | --- | --- | --- | --- |
| User and important-person names | Name | Personal info / Name | Yes | Profiles and relationship context |
| Account email and optional person email | Email Address | Personal info / Email address | Yes | Authentication and optional person context |
| Optional important-person phone number | Phone Number | Personal info / Phone number | Yes | Selected-contact context |
| Contacts explicitly selected for import | Contacts | Contacts | Yes | Create the user-selected People list |
| Avatar and private note images | Photos or Videos | Photos and videos / Photos | Yes | Profiles and memories |
| Voice notes | Audio Data | Audio files / Voice or sound recordings | Yes | User-created memories and notes |
| Notes, events, gift ideas, preferences and chat-provided context | Other User Content | App activity / Other user-generated content | Yes | Core care and memory features |
| Supabase account identifier | User ID | Device or other IDs / User ID | Yes | Ownership and authorization |
| Native push installation identifier/token | Device ID | Device or other IDs / Device ID | Yes | Deliver requested reminders |

The app-level iOS file at `ios/App/App/PrivacyInfo.xcprivacy` declares this
current set. Capacitor and CapacitorCordova ship their own manifests; their
required-reason API declarations remain the responsibility of those SDK
bundles. The app's own Swift code currently uses no required-reason API, so its
`NSPrivacyAccessedAPITypes` is intentionally empty.

## Submission checks

1. Compare this matrix with the production schema, Storage buckets, Edge/API
   routes and every SDK in the final lockfile.
2. Generate and inspect Xcode's privacy report from the Release archive.
3. Confirm the built app contains `PrivacyInfo.xcprivacy` at the app-bundle
   root and each required SDK contains a valid manifest.
4. Make App Store Connect and Google Play Console answers match the widest
   behavior available in that submitted build.
5. Verify that the public privacy policy describes account export, correction,
   deletion, retention, private media, AI processing and push tokens.
6. Re-audit before enabling analytics, crash reporting, subscriptions,
   location/social discovery, merchant links or any new AI provider. None of
   those future purposes are pre-declared here.

## Change gate

A feature that introduces a new data type, purpose, processor or SDK must update
all of the following in the same release:

- this disclosure matrix;
- `PrivacyInfo.xcprivacy` when applicable;
- App Store Connect privacy answers;
- Google Play Data safety answers;
- the public privacy policy and consent copy when required;
- account export/deletion coverage and privacy regression tests.
