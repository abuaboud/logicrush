import { Migrator, type Migration, type MigrationProvider } from 'kysely'
import { databaseService } from './database.js'
import { initial } from './migrations/001-initial.js'

// Migrations are listed explicitly rather than read off disk: the compiled
// output ships as .js in dist/, and a file-scanning provider behaves differently
// between `tsx src` and `node dist`. An explicit list behaves the same in both.
const MIGRATIONS: Record<string, Migration> = {
  '001-initial': initial,
}

const provider: MigrationProvider = {
  async getMigrations() {
    return MIGRATIONS
  },
}

export const migrations = {
  async up(): Promise<void> {
    const migrator = new Migrator({ db: databaseService.db(), provider })
    const { error, results } = await migrator.migrateToLatest()
    report(results, error)
  },

  async down(): Promise<void> {
    const migrator = new Migrator({ db: databaseService.db(), provider })
    const { error, results } = await migrator.migrateDown()
    report(results, error)
  },
}

function report(results: Awaited<ReturnType<Migrator['migrateToLatest']>>['results'], error: unknown): void {
  for (const r of results ?? []) {
    const verb = r.direction === 'Up' ? 'applied' : 'reverted'
    console.log(r.status === 'Success' ? `  ✔ ${verb} ${r.migrationName}` : `  ✖ failed ${r.migrationName}`)
  }
  if (error !== undefined) {
    console.error(error)
    throw error instanceof Error ? error : new Error(String(error))
  }
  if ((results ?? []).length === 0) console.log('  · already up to date')
}

const invokedDirectly = process.argv[1]?.includes('migrate') === true
if (invokedDirectly) {
  const direction = process.argv.includes('--down') ? 'down' : 'up'
  migrations[direction]()
    .then(async () => {
      await databaseService.close()
    })
    .catch(async () => {
      await databaseService.close()
      process.exit(1)
    })
}
