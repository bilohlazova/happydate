# iOS signing modes

## Local Debug on a physical iPhone

The Debug target intentionally has no `CODE_SIGN_ENTITLEMENTS`. This allows a
Personal Team to create a development provisioning profile and run HappyDate on
a connected iPhone. Push Notifications are unavailable in this mode because
Apple does not include the APNs entitlement in Personal Team profiles.

## Release and App Store builds

The Release target continues to use `App/App.entitlements`, including
`aps-environment`. Release signing therefore requires the paid Apple Developer
Program team, an App ID with Push Notifications enabled, and a matching
distribution/development profile managed by Xcode.

Do not add the Release entitlements back to Debug merely to make the capability
appear in Xcode: doing so prevents Personal Team provisioning. When the paid
team is available, Debug push testing can be enabled deliberately with a
separate team-aware configuration.
