import { runMigrations } from '../src/lib/db/migrate'
import { seed } from '../src/lib/db/seed'

async function main() {
  console.log('Running migrations...')
  runMigrations()
  console.log('Seeding database...')
  await seed()
  console.log('Done!')
}

main().catch(console.error)
