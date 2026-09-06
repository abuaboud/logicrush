# LogicRush legacy system

What the 2018 site does, and which parts are *product* (must survive) versus
*accident* (must not).

## Shape

- `logicrush-backend` — Spring Boot + Hibernate + MySQL, ~180 Java files, 68
  endpoints across 16 controllers. FCM push, SMTP mail, local image upload.
- `logicrush-angular` — Angular 8, TinyMCE, a resolver per route.
- Live at logicrush.com, Arabic/RTL, plus a Google Play app.

## Product — keep exactly

- **Contest scoring**: `P div 250` is **integer** division in the Java, so decay
  is whole points per minute and anything under 250 points never decays.
  `points = max(P − M×(P div 250) − (T−1)×20, floor(0.30×P))`. Every production
  point value is a multiple of 250, which hid this for nine years.
- **Rating**: the Codeforces algorithm verbatim — Elo seeds, `midRank =
  √(rank × seed)`, then two zero-sum passes (all contestants, then top `4√n`).
  Unrated users enter at 1500.
- **Blind cells**: burn every allowed attempt **while a contest is live** and you
  are told nothing until it ends; the cell scores zero. The `&& isActive()` term
  is load-bearing — after the contest ends cells stop being blind and score
  normally, so final standings legitimately differ from live ones.
- **Rating band colours** on usernames everywhere.
- **URL slugs** (`problem_key`, `contest_key`) — indexed since 2019.
- RTL Arabic, the gold wordmark, `#06458b` blue, black card headers.

## Accident — do not carry over

- **RPC over POST**: `POST /api/problem/list-practice`, `POST /api/vote/up-vote-comment`,
  `flip-approve-state`. Nothing cacheable, reads indistinguishable from writes.
- **A parallel `/api/admin/*` controller tree** duplicating the public one. Admin
  is an authorisation outcome, not a URL space.
- **The `revision` table**: problem/blog/comment bodies stored behind `*_rev_id`
  joins, with no history ever surfaced. Inline the content; drop the table.
- **Three comment tables** (`comment_blog`, `comment_problem`, `comment_solution`)
  over one shared comment row. One table with `(target, target_id)`.
- **Int enums** for visibility, privilege, gender, problem type.
- **Session-scoped `@Component` `User` bean** as the auth principal.
- **The scoreboard refresher**: an in-memory map rebuilt every 5 seconds by a
  `@Scheduled` job issuing a query per contestant per problem.

## Gotchas

**`approved` is never enforced.** `AProblemController` writes it and the admin
dashboard shows it, but no public read path filters on it — `GetPublicProblems`
filters on `visibility` alone. The dump therefore contains public-but-unapproved
problems that are live and indexed today. Adding an `approved = true` filter to
the rebuilt problemset would 404 real pages.

**Timezone is `Asia/Amman` wall clock.** Set as the JVM default in
`SpringBootWebApplication` and named explicitly in `Submission.getEpochSecond()`.
Jordan observed DST until October 2022 and has been permanent UTC+3 since, so a
single fixed offset shifts every pre-2022 summer contest by an hour — which
shifts elapsed minutes, which shifts every cell score and every rating.

**Passwords are unsalted MD5** (`Utils.MD5`), and the Angular client hashes before
sending (`RequestLogin.isHashPassword`).

**Contribution points come from votes.** `VoteController` moves the *target
author's* `contribution_points` by ±1 on a new vote and ±2 on a flip. Nothing else
writes them.

`Problem` has both an `author_id` and a `writer_id`, and they are routinely
different people — the profile page lists "authored" and "written" separately.
Treating them as one field silently drops credit from half the catalogue.
