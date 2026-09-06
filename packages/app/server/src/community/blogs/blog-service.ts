import { AppError, ErrorCode } from '@logicrush/shared'
import { databaseService } from '../../infra/database.js'
import { clock } from '../../infra/clock.js'
import { ids } from '../../infra/ids.js'
import type { Principal } from '../../identity/auth/security.js'
import { sanitize } from '../shared/sanitize.js'

export const blogService = {
  async forumIndex() {
    const db = databaseService.db()
    const subjects = await db.selectFrom('blog_subject').select(['id', 'title', 'order_index']).orderBy('order_index').execute()
    const categories = await db
      .selectFrom('blog_category')
      .leftJoin('blog', (join) => join.onRef('blog.category_id', '=', 'blog_category.id').on('blog.visibility', '<>', 'deleted'))
      .select((eb) => [
        'blog_category.id as id',
        'blog_category.slug as slug',
        'blog_category.title as title',
        'blog_category.description as description',
        'blog_category.subject_id as subjectId',
        'blog_category.order_index as orderIndex',
        eb.fn.count('blog.id').as('blogCount'),
        eb.fn.sum(eb.fn.coalesce('blog.comment_count', eb.val(0))).as('commentCount'),
      ])
      .groupBy(['blog_category.id'])
      .orderBy('blog_category.order_index')
      .execute()
    return subjects.map((s) => ({
      title: s.title,
      categories: categories
        .filter((c) => c.subjectId === s.id)
        .map((c) => ({
          slug: c.slug,
          title: c.title,
          description: c.description,
          blogCount: Number(c.blogCount),
          commentCount: Number(c.commentCount),
        })),
    }))
  },

  async listByCategory({ categorySlug, page, pageSize }: { categorySlug: string; page: number; pageSize: number }) {
    const db = databaseService.db()
    const category = await db.selectFrom('blog_category').select('id').where('slug', '=', categorySlug).executeTakeFirst()
    if (category === undefined) throw new AppError({ code: ErrorCode.ENTITY_NOT_FOUND, params: { categorySlug } })
    const rows = await db
      .selectFrom('blog')
      .innerJoin('user', 'user.id', 'blog.author_id')
      .select(['blog.id as id', 'blog.title as title', 'user.username as author', 'blog.comment_count as commentCount',
        'blog.up_votes as upVotes', 'blog.last_activity_at as lastActivityAt'])
      .where('blog.category_id', '=', category.id)
      .where('blog.visibility', '<>', 'deleted')
      .orderBy('blog.last_activity_at', 'desc')
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .execute()
    return { items: rows.map((r) => ({ ...r, lastActivityAt: r.lastActivityAt.toISOString() })), page, pageSize }
  },

  async get({ id }: { id: string }) {
    const row = await databaseService
      .db()
      .selectFrom('blog')
      .innerJoin('user', 'user.id', 'blog.author_id')
      .select(['blog.id as id', 'blog.title as title', 'blog.content as content', 'user.username as author',
        'blog.up_votes as upVotes', 'blog.down_votes as downVotes', 'blog.created_at as createdAt', 'blog.announcement as announcement'])
      .where('blog.id', '=', id)
      .where('blog.visibility', '<>', 'deleted')
      .executeTakeFirst()
    if (row === undefined) throw new AppError({ code: ErrorCode.ENTITY_NOT_FOUND, params: { entity: 'blog', id } })
    return { ...row, createdAt: row.createdAt.toISOString() }
  },

  async create({ categorySlug, title, content, viewer }: { categorySlug: string; title: string; content: string; viewer: Principal }) {
    const db = databaseService.db()
    const category = await db.selectFrom('blog_category').select('id').where('slug', '=', categorySlug).executeTakeFirst()
    if (category === undefined) throw new AppError({ code: ErrorCode.ENTITY_NOT_FOUND, params: { categorySlug } })
    const row = await db
      .insertInto('blog')
      .values({
        id: ids.new(), legacy_id: null, title, content: sanitize.html(content), author_id: viewer.userId,
        category_id: category.id, visibility: 'public', announcement: false, up_votes: 0, down_votes: 0,
        comment_count: 0, created_at: clock.now(), last_activity_at: clock.now(),
      })
      .returning('id')
      .executeTakeFirstOrThrow()
    return { id: row.id }
  },

  async update({ id, title, content, announcement, viewer }: {
    id: string; title?: string; content?: string; announcement?: boolean; viewer: Principal
  }) {
    const db = databaseService.db()
    const blog = await db.selectFrom('blog').select(['author_id']).where('id', '=', id).executeTakeFirst()
    if (blog === undefined) throw new AppError({ code: ErrorCode.ENTITY_NOT_FOUND, params: { id } })
    if (blog.author_id !== viewer.userId && viewer.role !== 'admin') {
      throw new AppError({ code: ErrorCode.FORBIDDEN, params: { reason: 'not_author' } })
    }
    // Only an admin may set the announcement flag; a non-admin including it is a
    // 403, never a silent drop.
    if (announcement !== undefined && viewer.role !== 'admin') {
      throw new AppError({ code: ErrorCode.FORBIDDEN, params: { reason: 'announcement_admin_only' } })
    }
    const patch: Record<string, unknown> = {}
    if (title !== undefined) patch.title = title
    if (content !== undefined) patch.content = sanitize.html(content)
    if (announcement !== undefined) patch.announcement = announcement
    await db.updateTable('blog').set(patch).where('id', '=', id).execute()
    return { ok: true }
  },

  async remove({ id, viewer }: { id: string; viewer: Principal }) {
    const db = databaseService.db()
    const blog = await db.selectFrom('blog').select(['author_id']).where('id', '=', id).executeTakeFirst()
    if (blog === undefined) throw new AppError({ code: ErrorCode.ENTITY_NOT_FOUND, params: { id } })
    if (blog.author_id !== viewer.userId && viewer.role !== 'admin') {
      throw new AppError({ code: ErrorCode.FORBIDDEN, params: { reason: 'not_author' } })
    }
    await db.updateTable('blog').set({ visibility: 'deleted' }).where('id', '=', id).execute()
    return { ok: true }
  },
}
