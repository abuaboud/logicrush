import { AppError, ErrorCode } from '@logicrush/shared'
import { databaseService } from '../../infra/database.js'
import { ids } from '../../infra/ids.js'
import type { Principal } from '../../identity/auth/security.js'

type Target = 'blog' | 'comment'

// Voting moves the TARGET AUTHOR's contribution_points, exactly as legacy did:
// +/-1 on a new vote, +/-2 on a flip. That counter drives the home page's
// contributors leaderboard, so it must stay consistent with the vote rows -- the
// up/down counters are always recomputed from the rows, never incremented blind.
export const voteService = {
  async cast({
    target,
    targetId,
    value,
    viewer,
  }: {
    target: Target
    targetId: string
    value: 1 | -1
    viewer: Principal
  }): Promise<{ ok: boolean }> {
    const db = databaseService.db()
    const authorId = await targetAuthor(target, targetId)
    if (authorId === viewer.userId) {
      // Legacy allowed self-voting; we forbid it (deliberate tightening).
      throw new AppError({ code: ErrorCode.CONFLICT, params: { reason: 'self_vote' } })
    }
    const up = value === 1

    await db.transaction().execute(async (tx) => {
      const existing = await tx
        .selectFrom('vote')
        .select(['id', 'up_vote'])
        .where('user_id', '=', viewer.userId)
        .where('target', '=', target)
        .where('target_id', '=', targetId)
        .executeTakeFirst()

      let contribDelta = 0
      if (existing === undefined) {
        await tx
          .insertInto('vote')
          .values({ id: ids.new(), legacy_id: null, target, target_id: targetId, user_id: viewer.userId, up_vote: up })
          .execute()
        contribDelta = up ? 1 : -1
      } else if (existing.up_vote !== up) {
        await tx.updateTable('vote').set({ up_vote: up }).where('id', '=', existing.id).execute()
        contribDelta = up ? 2 : -2 // a flip
      } else {
        return // same vote again -- idempotent no-op
      }

      const counts = await tx
        .selectFrom('vote')
        .select((eb) => [
          eb.fn.count('id').filterWhere('up_vote', '=', true).as('up'),
          eb.fn.count('id').filterWhere('up_vote', '=', false).as('down'),
        ])
        .where('target', '=', target)
        .where('target_id', '=', targetId)
        .executeTakeFirstOrThrow()
      await tx
        .updateTable(target)
        .set({ up_votes: Number(counts.up), down_votes: Number(counts.down) })
        .where('id', '=', targetId)
        .execute()

      await tx
        .updateTable('user')
        .set((eb) => ({ contribution_points: eb('contribution_points', '+', contribDelta) }))
        .where('id', '=', authorId)
        .execute()
    })
    return { ok: true }
  },

  async remove({ target, targetId, viewer }: { target: Target; targetId: string; viewer: Principal }): Promise<{ ok: boolean }> {
    const db = databaseService.db()
    await db.transaction().execute(async (tx) => {
      const existing = await tx
        .selectFrom('vote')
        .select(['id', 'up_vote'])
        .where('user_id', '=', viewer.userId)
        .where('target', '=', target)
        .where('target_id', '=', targetId)
        .executeTakeFirst()
      if (existing === undefined) return
      await tx.deleteFrom('vote').where('id', '=', existing.id).execute()
      const counts = await tx
        .selectFrom('vote')
        .select((eb) => [
          eb.fn.count('id').filterWhere('up_vote', '=', true).as('up'),
          eb.fn.count('id').filterWhere('up_vote', '=', false).as('down'),
        ])
        .where('target', '=', target)
        .where('target_id', '=', targetId)
        .executeTakeFirstOrThrow()
      await tx.updateTable(target).set({ up_votes: Number(counts.up), down_votes: Number(counts.down) }).where('id', '=', targetId).execute()
      const authorId = await targetAuthor(target, targetId)
      await tx
        .updateTable('user')
        .set((eb) => ({ contribution_points: eb('contribution_points', '+', existing.up_vote ? -1 : 1) }))
        .where('id', '=', authorId)
        .execute()
    })
    return { ok: true }
  },
}

async function targetAuthor(target: Target, targetId: string): Promise<string> {
  const row = await databaseService.db().selectFrom(target).select('author_id').where('id', '=', targetId).executeTakeFirst()
  if (row === undefined) throw new AppError({ code: ErrorCode.ENTITY_NOT_FOUND, params: { target, targetId } })
  return row.author_id
}
