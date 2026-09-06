import { AppError, ErrorCode } from '@logicrush/shared'
import { databaseService } from '../../infra/database.js'
import { clock } from '../../infra/clock.js'
import { ids } from '../../infra/ids.js'
import type { Principal } from '../../identity/auth/security.js'
import { sanitize } from '../shared/sanitize.js'
import { ratingBandColor } from '../../identity/users/user-service.js'

type Target = 'blog' | 'problem' | 'solution'

// One comment table for all three targets. A deleted comment leaves a tombstone
// so replies beneath it do not orphan.
export const commentService = {
  async list({ target, targetId }: { target: Target; targetId: string }) {
    const rows = await databaseService
      .db()
      .selectFrom('comment')
      .innerJoin('user', 'user.id', 'comment.author_id')
      .select(['comment.id as id', 'comment.parent_id as parentId', 'comment.content as content',
        'comment.visibility as visibility', 'comment.up_votes as upVotes', 'comment.down_votes as downVotes',
        'comment.created_at as createdAt', 'user.username as author', 'user.rating as authorRating'])
      .where('comment.target', '=', target)
      .where('comment.target_id', '=', targetId)
      .orderBy('comment.created_at', 'asc')
      .execute()
    return rows.map((r) => ({
      id: r.id,
      parentId: r.parentId,
      content: r.visibility === 'deleted' ? null : r.content,
      deleted: r.visibility === 'deleted',
      upVotes: r.upVotes,
      downVotes: r.downVotes,
      author: r.author,
      authorBandColor: ratingBandColor(r.authorRating),
      createdAt: r.createdAt.toISOString(),
    }))
  },

  async create({ target, targetId, parentId, content, viewer }: {
    target: Target; targetId: string; parentId: string | null; content: string; viewer: Principal
  }) {
    const db = databaseService.db()
    const id = ids.new()
    await db.insertInto('comment').values({
      id, legacy_id: null, target, target_id: targetId, parent_id: parentId, author_id: viewer.userId,
      content: sanitize.html(content), visibility: 'public', up_votes: 0, down_votes: 0, created_at: clock.now(),
    }).execute()
    if (target === 'blog') {
      await db.updateTable('blog').set((eb) => ({ comment_count: eb('comment_count', '+', 1), last_activity_at: clock.now() }))
        .where('id', '=', targetId).execute()
    }
    return { id }
  },

  async remove({ id, viewer }: { id: string; viewer: Principal }) {
    const db = databaseService.db()
    const row = await db.selectFrom('comment').select(['author_id', 'target', 'target_id']).where('id', '=', id).executeTakeFirst()
    if (row === undefined) throw new AppError({ code: ErrorCode.ENTITY_NOT_FOUND, params: { id } })
    if (row.author_id !== viewer.userId && viewer.role !== 'admin') {
      throw new AppError({ code: ErrorCode.FORBIDDEN, params: { reason: 'not_author' } })
    }
    await db.updateTable('comment').set({ visibility: 'deleted' }).where('id', '=', id).execute()
    if (row.target === 'blog') {
      await db.updateTable('blog').set((eb) => ({ comment_count: eb('comment_count', '-', 1) }))
        .where('id', '=', row.target_id).execute()
    }
    return { ok: true }
  },
}
