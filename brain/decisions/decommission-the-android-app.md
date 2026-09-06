---
status: accepted
---

# Decommission the LogicRush Android app instead of rebuilding it

## Decision

Retire `com.logicrush` rather than porting it to the new stack. The website becomes the
only client. Firebase Cloud Messaging, the `user.device_token` column, and the three
app-only endpoints (`current-version`, `minimum-version`, `click-notification`) are not
carried into the rebuild.

The takedown is staged: raise `minimum-version` on the legacy backend above any released
build so installed copies show their force-update screen pointing at logicrush.com, let
that notice sit for a grace period, then unpublish the listing, then cut over.

## Context

The app is a second client against the same product, tied to the legacy Spring API that
switches off at cutover. Its whole surface is already usable in a mobile browser, and
the rebuild is responsive by default.

## Why

- The app's own force-update check is a ready-made shutdown channel — users get an
  Arabic message telling them where to go, not a wall of network errors.
- Unpublishing preserves the listing and its reviews; deleting does not.
- A native client is the largest recurring cost in the rebuild and duplicates work we
  are doing anyway.

## Consequences

- Push notifications end. In-app notifications stay, and notification creation is kept
  behind one call site per event type so web push is an addition later, not a rewrite.
- Cutover is gated on the shutdown notice having actually been live — the gate is the
  point, because skipping it converts a controlled retirement into silent breakage.
- Reviving the app later means a fresh build against the new REST API.
