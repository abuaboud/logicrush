// Golden replay (#30): recompute every past contest's scoreboard from the
// migrated submissions with the rebuilt scoring, and compare the computed contest
// rank to the rank legacy recorded in rating_change. Run after a migration:
//   DATABASE_URL=... node packages/app/server/scripts/golden-replay.mjs
// (requires `npm run build -w @logicrush/server` first)
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const d = path.dirname(fileURLToPath(import.meta.url))
process.env.NODE_ENV ||= 'test'; process.env.AUTH_SECRET ||= 'replay'
const { databaseService } = await import(path.join(d, '../dist/infra/database.js'))
const { scoreboardService } = await import(path.join(d, '../dist/competition/scoreboard/scoreboard-service.js'))
const { clock } = await import(path.join(d, '../dist/infra/clock.js'))

const db = databaseService.db()
clock.pin(new Date('2030-01-01T00:00:00Z')) // every contest finished -> no blind cells
const contests = await db.selectFrom('contest').innerJoin('rating_change', 'rating_change.contest_id', 'contest.id')
  .select(['contest.slug as slug']).groupBy('contest.slug').execute()
let users = 0, match = 0, perfect = 0
const diffs = []
for (const c of contests) {
  const board = await scoreboardService.forContest({ slug: c.slug })
  const computed = new Map(board.map((r) => [r.username, r.rank]))
  const recorded = await db.selectFrom('rating_change').innerJoin('contest', 'contest.id', 'rating_change.contest_id')
    .innerJoin('user', 'user.id', 'rating_change.user_id').select(['user.username as username', 'rating_change.rank as rank'])
    .where('contest.slug', '=', c.slug).execute()
  let bad = 0
  for (const r of recorded) { users++; if (computed.get(r.username) === r.rank) match++; else bad++ }
  if (recorded.length > 0 && bad === 0) perfect++
  else if (recorded.length > 0) diffs.push(`${c.slug}: ${recorded.length - bad}/${recorded.length}`)
}
console.log(`Contests: ${contests.length} | fully reproduced: ${perfect} | contestant ranks matched: ${match}/${users}`)
if (diffs.length) { console.log('Differences:'); diffs.forEach((x) => console.log('  ' + x)) }
await databaseService.close()
