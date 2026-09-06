import env from 'env-var'

export const configs = {
  port: env.get('PORT').default(3000).asPortNumber(),
  nodeEnv: env.get('NODE_ENV').default('development').asString(),
  isDev: env.get('NODE_ENV').default('development').asString() !== 'production',
  logLevel: env.get('LOG_LEVEL').default('info').asString(),
  // PGlite data dir (embedded Postgres). Unset = in-memory (tests). See database.ts.
  pgliteDataDir: env.get('PGLITE_DATA_DIR').asString(),
  authSecret: env.get('AUTH_SECRET').required().asString(),
  frontendUrl: env.get('FRONTEND_URL').default('http://localhost:5173').asUrlString(),
}
