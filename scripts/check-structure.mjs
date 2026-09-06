// A group folder names what a set of modules is ABOUT and holds no code of its
// own. dependency-cruiser lints import direction, not file placement, so this
// is the only thing that measures the rule.
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const SRC = 'packages/app/server/src'
const GROUPS = ['identity', 'catalog', 'competition', 'community']

const offences = []
for (const group of GROUPS) {
  const dir = join(SRC, group)
  let entries
  try {
    entries = readdirSync(dir)
  } catch {
    continue
  }
  for (const entry of entries) {
    if (!entry.endsWith('.ts')) continue
    offences.push(`${group}/${entry} (${statSync(join(dir, entry)).size} bytes)`)
  }
}

if (offences.length > 0) {
  console.error('\n✖ code found directly in a group folder — it belongs in a module below it:\n')
  for (const offence of offences) console.error(`    ${SRC}/${offence}`)
  console.error('\n  A group folder names what a set of modules is ABOUT and holds no code.\n')
  process.exit(1)
}

console.log(`✔ no code in group folders (${GROUPS.join(', ')})`)
