import { databaseService } from '../../infra/database.js'

export const tagService = {
  async list(): Promise<{ name: string; description: string | null; problemCount: number }[]> {
    const rows = await databaseService
      .db()
      .selectFrom('tag')
      .leftJoin('problem_tag', 'problem_tag.tag_id', 'tag.id')
      .select((eb) => ['tag.name as name', 'tag.description as description', eb.fn.count('problem_tag.problem_id').as('cnt')])
      .groupBy(['tag.name', 'tag.description'])
      .orderBy('cnt', 'desc')
      .execute()
    return rows.map((r) => ({ name: r.name, description: r.description, problemCount: Number(r.cnt) }))
  },
}
