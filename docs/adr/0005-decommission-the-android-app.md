# 5. Decommission the Android app rather than rebuild it

Date: 2026-09-06
Status: accepted

## Context

LogicRush ships an Android app (`com.logicrush`) on the Play Store. It talks to the
legacy Spring API, which is switched off at cutover. Three things in the legacy
backend exist only to serve it:

- `GET /api/general/current-version` and `GET /api/general/minimum-version`, which
  return a `"<build>/<message>"` string the app uses to force-update itself.
- `POST /api/general/click-notification`, which records `Activity.CLICK_NOTIFICATION`.
- Firebase Cloud Messaging (`fcm/FCMService`, `fcm/FCMInitializer`) plus the
  `user.device_token` column, used to push notifications to devices.

Rebuilding the app is a second client, a second release process and a second store
listing, against a product whose whole surface is already usable in a mobile browser.

## Decision

Take the app down. Do not port the version endpoints, the notification-click endpoint,
FCM, or `user.device_token`. The website is the only client.

The takedown is **staged, not simultaneous with cutover**: raise `minimum-version` on
the *legacy* backend above any released build, so installed copies show their own
force-update screen carrying a message that points at logicrush.com. Give that notice a
grace period to reach users, then unpublish the listing, then cut over.

## Why

- The app's force-update mechanism is already a shutdown channel. Using it means users
  get a sentence in Arabic telling them where to go, instead of a network error.
- Unpublishing rather than deleting keeps the listing, its history and its reviews
  recoverable if the decision is ever revisited.
- Maintaining a native client is the single largest ongoing cost in the rebuild, and it
  duplicates a responsive web app we are building anyway.

## Consequences

- Push notifications go away entirely. In-app notifications remain; a future web-push
  transport is possible because notification creation stays behind one call site per
  event type (see issue #40).
- `user.device_token` is not migrated, and `Activity.CLICK_NOTIFICATION` rows become
  historical-only.
- Play Store links must come off the site — the footer icon and the download line above
  the problemset.
- Cutover (#47) is gated on the shutdown notice having actually been live for the grace
  period. Skipping that turns a controlled retirement back into a silent breakage.
- If the app is ever wanted again it is a fresh build against the new resource-oriented
  API, not a revival of the old one.
