import { Kysely, PostgresDialect } from 'kysely'
import pg from 'pg'
import type { Database } from '@logicrush/shared/db'
import { configs } from '../configs.js'

let instance: Kysely<Database> | undefined

export const databaseService = {
  db(): Kysely<Database> {
    if (instance === undefined) {
      instance = new Kysely<Database>({
        dialect: new PostgresDialect({
          pool: new pg.Pool({ connectionString: configs.databaseUrl }),
        }),
      })
    }
    return instance
  },

  async close(): Promise<void> {
    await instance?.destroy()
    instance = undefined
  },
}
