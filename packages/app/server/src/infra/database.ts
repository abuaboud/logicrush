import { Kysely } from 'kysely'
import { PGlite } from '@electric-sql/pglite'
import { KyselyPGlite } from 'kysely-pglite'
import type { Database } from '@logicrush/shared/db'
import { configs } from '../configs.js'

let instance: Kysely<Database> | undefined

// PGlite is an in-process Postgres (WASM): no DB server to run. File-backed when
// PGLITE_DATA_DIR is set, in-memory otherwise (tests). It is single-connection,
// so queries serialize -- fine for the beta. connect() must run before db().
export const databaseService = {
  async connect(): Promise<Kysely<Database>> {
    if (instance === undefined) {
      const client = new PGlite(configs.pgliteDataDir)
      const { dialect } = new KyselyPGlite(client)
      instance = new Kysely<Database>({ dialect })
    }
    return instance
  },

  db(): Kysely<Database> {
    if (instance === undefined) {
      throw new Error('Database not connected: call databaseService.connect() at startup')
    }
    return instance
  },

  async close(): Promise<void> {
    await instance?.destroy()
    instance = undefined
  },
}
