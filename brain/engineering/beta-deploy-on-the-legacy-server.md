# Deploying beta alongside the untouched legacy site

`beta.logicrush.com` runs on the same Hetzner box (91.99.174.74) as the live
legacy site, without disturbing it.

Shape:
- App + web built in a `node:22` container (host Node 18 is too old), served on
  `127.0.0.1:8090` via `docker run -d --restart unless-stopped`. Data in PGlite
  (`PGLITE_DATA_DIR`, a mounted dir) — see the PGlite decision.
- nginx serves the web build statically and proxies `/api`, `/uploads`,
  `/robots.txt`, `/sitemap.xml` to `:8090`.
- Web dist lives in `/var/www/logicrush-beta` (world-readable). **Do not** point
  nginx `root` at anything under `/root` — its mode is 700, so the nginx worker
  gets permission-denied and silently serves nothing.
- Cloudflare: beta A record → origin IP, **proxied**, zone SSL Flexible (CF
  terminates TLS, talks HTTP to origin :80). A proxied record pointing at a CF IP
  is Error 1000 — see the Cloudflare incident decision.

## Gotcha: name-based vhost must match the existing listen address

The legacy `default` block binds a **specific IP**: `listen 91.99.174.74:80;`.
A new server block using `listen 80;` (i.e. `0.0.0.0:80`) is a *different* listen
socket — nginx never binds it (the specific IP already owns the port), so requests
for `beta.logicrush.com` arrive on the legacy socket, don't match the beta
`server_name`, and fall through to the legacy Spring Boot backend (you get its
`{"timestamp":...,"status":404}` JSON, not your app).

Fix: the beta block must use the **same** listen address as the block already on
that socket — `listen 91.99.174.74:80;`. Then `server_name` selection picks beta
for the beta Host. Confirm with `nginx -T` that both blocks share the listen line,
and test with `curl -H 'Host: beta.logicrush.com' http://<ip>/api/health` before
touching DNS.
