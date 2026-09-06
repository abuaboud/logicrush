# LogicRush

An Arabic-language educational platform for computational and logical thinking,
built around **Problems** solved individually for practice and in timed
**Contests** that move a **Rating**. Originally a Spring Boot + Angular site
(2018–2024); this repo is the rebuild on React + Fastify. The product is
**right-to-left Arabic first** — RTL is the default direction, not a mode.

## Language

**Problem**:
A single question with a written **Description** and a hidden **Solution**. Two
**types**: a **Choice** problem (the solver picks one **Option**) and a
**Fill-in-blank** problem (the solver types an answer, compared
case-insensitively against `correctOption`). Every problem has a **Slug** — the
legacy `problem_key` — which is what appears in URLs and must survive the
migration unchanged. A problem is written by a **Writer** and credited to an
**Author**; both are Users and they are frequently different people.
_Avoid_: "question" in code (the UI says سؤال; the code says Problem);
"answer" for the Option rows (an Option is a choice, an Answer is what a solver
submitted); treating `id` as the URL identifier (that is the Slug).

**Option**:
One selectable choice on a Choice problem, ordered by `orderIndex`. Options
carry their own **Visibility**, so a setter can hide one without deleting it.
Fill-in-blank problems have no Options.
_Avoid_: storing the correct choice as a flag on the Option — the problem's
`correctOption` names it, matched case-insensitively.

**Visibility**:
The lifecycle state shared by Problems, Contests, Blogs, Comments and Options:
**public**, **unlisted**, or **deleted**. Deleted is a soft state — the row
stays and is filtered out of every list. Legacy stored this as an int (0/1/2).
_Avoid_: hard deletes; a separate `deleted` boolean beside this field.

**Submission**:
One attempt by a User at a Problem, storing the raw `answer`, whether it was
**correct**, and when. Submissions are append-only and are the sole source of
truth for both the practice status and the contest scoreboard — nothing else
records "solved". A submission made during a contest window counts for that
contest; the same table serves practice.
_Avoid_: a separate "solved" table; mutating a submission after the fact.

**Blind**:
A cell state on the scoreboard, not a property of a Submission. A contestant is
**blind** on a problem when they have used every allowed attempt **while the
contest is still running**: further attempts are accepted but they are told
nothing about correctness until the contest ends, and the cell scores zero.
The clock term is part of the definition — when the contest ends, no cell is
blind any more, and a blind-but-correct answer scores normally. Final standings
therefore differ from the standings shown during the contest, by design.
_Avoid_: reading `submission.blind` as authoritative (the scoreboard recomputes
it); defining blind from attempt count alone without the active-contest term;
showing a blind contestant a correct/incorrect result mid-contest.

**Contest**:
A titled window — `startsAt` plus `lengthMinutes` — holding an ordered set of
Problems. Users **register** before or during it; only registered users appear
on the **Scoreboard**. A Contest has a **Slug** (legacy `contest_key`) used in
URLs. A contest is **active** between start and end, **past** after, **future**
before.
_Avoid_: computing "finished" from a stored flag (it is derived from the clock);
letting unregistered users onto the scoreboard.

**Scoring**:
How a Contest cell earns points. `P / 250` is **integer division** — the legacy
Java divides two ints — so the decay is a whole number of points per minute and a
problem worth under 250 points never decays at all:

```
decayPerMinute = P div 250                 (integer; 100 div 250 == 0)
points         = max(P − M × decayPerMinute − (T − 1) × 20, floor(0.30 × P))
```

Each wrong try costs a flat 20 and a solved cell never falls below 30% of the
problem's points. A blind cell scores zero **only while the contest is running**.
This formula is published to users on the أسس التقييم post and must not drift.
_Avoid_: writing `P / 250` as real division (it rescores every problem whose
points are not a multiple of 250 — which is why this went unnoticed for nine
years); re-deriving the constants (`POINT_DECAY_DIVISOR`, `WRONG_ANSWER_PENALTY`,
`MIN_POINTS_FRACTION` in `@logicrush/shared`); applying `floor` to the whole
expression rather than to the `0.30 × P` term alone.

**Rating**:
A contestant's skill number, moved only by rated Contests. The algorithm is
Codeforces' — seed from pairwise Elo win probabilities, midRank as the geometric
mean of actual rank and seed, then two zero-sum corrections (all contestants,
then the top `4·√n`). A user with no history rates **1500** on entry and their
stored rating is the `newRating` of their most recent **Rating change**.
_Avoid_: inventing a simpler Elo (the numbers are user-visible history and must
reproduce); recomputing a past contest's rating changes.

**Rating band**:
The colour and name a Rating maps to — newbie through legend — applied to a
username everywhere it appears. The band table is in `@logicrush/shared` and is
the single source; the server sends the colour with scoreboard and profile rows.
_Avoid_: duplicating the thresholds in CSS or in a web-side helper.

**Blog**:
A post in the **Forum**, filed under a **Category**. A Blog flagged as an
**announcement** is pinned to the home page. Blogs and Comments both carry
**up/down votes** from the Vote table.
_Avoid_: "article" or "post" in code; a separate announcements table.

**Comment**:
A threaded remark on one of three targets — a **Blog**, a **Problem**, or a
Problem's **Solution** — identified by `(target, targetId)`. Legacy used three
join tables over a shared comment row; the rebuild uses one table with a
discriminated target.
_Avoid_: re-introducing per-target comment tables; a comment that points at two
targets.

**Contribution points**:
A User counter, separate from Rating, that ranks the home page's contributors
list. Earned from authoring problems and forum activity.
_Avoid_: conflating it with Rating.

**Tutorial access**:
A per-user unlock on a Problem's Solution. A solver spends nothing to read a
solution they have solved; unlocking one they have not is recorded so the UI can
stop offering it.
_Avoid_: exposing `problem.solution` on any list payload.

**Revision**:
A legacy table only. Problem descriptions, blog bodies and comment bodies were
stored as `revision` rows joined by `*_rev_id`, but no history was ever surfaced.
The rebuild inlines content and drops the table; the term survives here so the
migration code is readable.
_Avoid_: reintroducing revisions without a product reason.
