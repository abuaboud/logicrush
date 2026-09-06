import { databaseService } from '../../infra/database.js'
import type { Principal } from '../auth/security.js'

// In-app notifications. FCM/push was dropped with the Android app (ADR 0005);
// creation stays behind one call site per event type so a web-push transport
// could be added later without touching producers.
export const notificationService = {
  async list({ viewer, page, pageSize }: { viewer: Principal; page: number; pageSize: number }) {
    const rows = await databaseService
      .db()
      .selectFrom('notification')
      .select(['id', 'content', 'link', 'read', 'created_at'])
      .where('user_id', '=', viewer.userId)
      .orderBy('created_at', 'desc')
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .execute()
    return {
      items: rows.map((r) => ({ id: r.id, content: r.content, link: r.link, read: r.read, createdAt: r.created_at.toISOString() })),
      page,
      pageSize,
    }
  },

  async unreadCount({ viewer }: { viewer: Principal }): Promise<number> {
    const row = await databaseService
      .db()
      .selectFrom('notification')
      .select((eb) => eb.fn.countAll().as('n'))
      .where('user_id', '=', viewer.userId)
      .where('read', '=', false)
      .executeTakeFirstOrThrow()
    return Number(row.n)
  },

  async markRead({ viewer, id }: { viewer: Principal; id: string }): Promise<void> {
    await databaseService.db().updateTable('notification').set({ read: true })
      .where('id', '=', id).where('user_id', '=', viewer.userId).execute()
  },

  async markAllRead({ viewer }: { viewer: Principal }): Promise<void> {
    await databaseService.db().updateTable('notification').set({ read: true })
      .where('user_id', '=', viewer.userId).where('read', '=', false).execute()
  },
}
