import { databaseService } from '../../infra/database.js'
import { userService, ratingBandColor } from './user-service.js'

// The profile page. Authored and written problems are two distinct lists on
// purpose: problem.author_id and problem.writer_id are frequently different
// people, and collapsing them drops half the catalogue's credit.
export const profileService = {
  async getProfile({ username }: { username: string }) {
    const user = await userService.getByUsernameOrThrow({ username })
    const db = databaseService.db()

    const [authored, written, solved, badges] = await Promise.all([
      db.selectFrom('problem').select(['slug', 'title', 'points']).where('author_id', '=', user.id)
        .where('visibility', '=', 'public').orderBy('created_at', 'desc').execute(),
      db.selectFrom('problem').select(['slug', 'title', 'points']).where('writer_id', '=', user.id)
        .where('visibility', '=', 'public').orderBy('created_at', 'desc').execute(),
      db.selectFrom('submission').innerJoin('problem', 'problem.id', 'submission.problem_id')
        .select(['problem.slug as slug', 'problem.title as title', 'problem.points as points'])
        .where('submission.user_id', '=', user.id).where('submission.correct', '=', true)
        .where('problem.visibility', '=', 'public').groupBy(['problem.slug', 'problem.title', 'problem.points'])
        .execute(),
      db.selectFrom('badge_user').innerJoin('badge', 'badge.id', 'badge_user.badge_id')
        .select(['badge.title as title', 'badge.description as description', 'badge.img_url as imgUrl'])
        .where('badge_user.user_id', '=', user.id).where('badge.deleted', '=', false)
        .orderBy('badge_user.awarded_at', 'asc').execute(),
    ])

    return {
      user: { ...user, bandColor: ratingBandColor(user.rating) },
      authored,
      written,
      solved,
      badges,
    }
  },

  async getRatingChanges({ username }: { username: string }) {
    const user = await userService.getByUsernameOrThrow({ username })
    return databaseService
      .db()
      .selectFrom('rating_change')
      .innerJoin('contest', 'contest.id', 'rating_change.contest_id')
      .select(['contest.slug as contestSlug', 'contest.title as contestTitle', 'rating_change.rank as rank',
        'rating_change.new_rating as newRating', 'contest.starts_at as at'])
      .where('rating_change.user_id', '=', user.id)
      .orderBy('contest.starts_at', 'asc')
      .execute()
  },
}
