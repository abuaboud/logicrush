import { databaseService } from '../../infra/database.js'
import { clock } from '../../infra/clock.js'
import { contestService } from '../../competition/contests/contest-service.js'
import { ratingBandColor } from '../../identity/users/user-service.js'

// One query set for the whole landing page so it can be served (and cached) in a
// single request rather than four.
export const homeService = {
  async get() {
    const db = databaseService.db()
    const now = clock.now()

    const [announcements, contests, topRated, topContributors] = await Promise.all([
      db.selectFrom('blog').innerJoin('user', 'user.id', 'blog.author_id')
        .select(['blog.id as id', 'blog.title as title', 'blog.content as content', 'user.username as author', 'blog.created_at as createdAt'])
        .where('blog.announcement', '=', true).where('blog.visibility', '<>', 'deleted')
        .orderBy('blog.created_at', 'desc').limit(5).execute(),
      db.selectFrom('contest').select(['slug', 'title', 'starts_at', 'length_minutes'])
        .where('visibility', '=', 'public').execute(),
      db.selectFrom('user').select(['username', 'rating']).orderBy('rating', 'desc').orderBy('username').limit(10).execute(),
      db.selectFrom('user').select(['username', 'contribution_points']).orderBy('contribution_points', 'desc').orderBy('username').limit(10).execute(),
    ])

    return {
      announcements: announcements.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() })),
      contests: contests
        .map((c) => ({
          slug: c.slug, title: c.title, startsAt: c.starts_at.toISOString(),
          lengthMinutes: c.length_minutes,
          state: contestService.stateOf(c.starts_at, c.length_minutes, now),
        }))
        .filter((c) => c.state !== 'past')
        .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()),
      topRated: topRated.map((u, i) => ({ rank: i + 1, username: u.username, rating: u.rating, bandColor: ratingBandColor(u.rating) })),
      topContributors: topContributors.map((u, i) => ({ rank: i + 1, username: u.username, contributionPoints: u.contribution_points })),
    }
  },
}
