# Verify pages logged-out, and watch shared route-config reuse

Two forum bugs shipped to beta that unit/integration tests missed because they
only exercised the data layer and authed paths. The lesson: **click the real
pages as an anonymous visitor.**

## What broke

- **A shared route-config constant reused across security levels.** In
  `blog-controller.ts`, one `const ById = { config: AUTH, ... }` object was used
  for both the mutations (`DELETE /blogs/:id`) *and* the public read
  `GET /blogs/:id`. So reading any forum post returned 401, and the blog page
  spun on "جار التحميل" forever for logged-out users. Fix: a separate
  `PublicById` config for the read. **Never share a route-config object between
  public and authenticated routes** — the security flag rides on it.
- **Missing navigation the API couldn't reveal.** Forum categories and usernames
  rendered as plain `<div>`/`<span>` instead of links, and no list page had a
  pagination control — all invisible to API tests. Legacy had all three.

## The check that would have caught it

- Load key pages **logged out** in a browser and click through: forum index →
  category → post; a username → profile; list page 2. The API returning 200 for
  a data query does not mean the page renders or that you can navigate to it.
- Regression-guard the public-read decision with an anonymous request in the
  integration suite (e.g. `GET /api/blogs/:id` with no cookie expects 200).
