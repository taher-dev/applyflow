import { execSync } from 'node:child_process'

console.log('[applyflow-server] Generating Prisma Client...')
try {
  execSync('npx prisma generate', { stdio: 'inherit' })
} catch (err) {
  console.warn('[applyflow-server] Prisma generate notice:', err instanceof Error ? err.message : String(err))
}

console.log('[applyflow-server] Compiling TypeScript with tsc...')
execSync('npx tsc', { stdio: 'inherit' })
console.log('[applyflow-server] Server build completed successfully.')
