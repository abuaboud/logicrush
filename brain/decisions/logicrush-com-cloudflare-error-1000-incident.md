---
status: accepted
---

# logicrush.com outage: Cloudflare Error 1000 (DNS pointed at Cloudflare IPs)

## What happened

2026-09-06: logicrush.com started returning **HTTP 403** on every request, edge
page titled *"DNS points to prohibited IP"* (Cloudflare **Error 1000**). The
origin was healthy the whole time (`http://91.99.174.74:80` with the right Host
served the real Angular app).

## Root cause

After the domain was moved onto Cloudflare, the **proxied** A/AAAA records for the
apex and `www` were set to **Cloudflare's own anycast IPs** (`104.21.72.61`,
`172.67.175.243`, `2606:4700::…`) instead of the origin. A proxied record whose
content is a Cloudflare IP is refused with Error 1000 — the edge will not proxy to
itself. This is the classic mistake of copying the *resolved* edge IPs into the
DNS records.

## Fix

Repointed `logicrush.com` and `www` A records to the origin **91.99.174.74**
(kept proxied), deleted the duplicate A records and all four AAAA records (they
also pointed at Cloudflare IPv6 → same Error 1000; origin is IPv4-only). SSL/TLS
mode was already **Flexible**, which is correct here because the origin serves
only HTTP :80 — Full/Full-strict would give 522.

Verified: apex, www, JS bundles, `/api/*` and assets all return 200.

## Lessons

- **A proxied Cloudflare DNS record must contain the ORIGIN IP, never a
  Cloudflare IP.** Error 1000 = "you pointed a proxied record at Cloudflare."
- Diagnose edge-vs-origin fast: `curl -H 'Host: logicrush.com' http://<origin-ip>/`
  hits the origin directly. If origin is 200 but the domain is 403/5xx, the fault
  is in Cloudflare config, not the app.
- This origin has **no HTTPS on :443** (times out) — keep SSL/TLS on **Flexible**,
  or install an origin cert before switching to Full.
- The fix was done through the Cloudflare API (MCP), not the dashboard, because
  the agent's classifier (correctly) blocks automated keystrokes into a
  production settings dashboard. API calls with a scoped token are the clean path.
