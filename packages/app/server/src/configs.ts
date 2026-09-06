import env from 'env-var'

export const configs = {
  port: env.get('PORT').default(3000).asPortNumber(),
  nodeEnv: env.get('NODE_ENV').default('development').asString(),
  isDev: env.get('NODE_ENV').default('development').asString() !== 'production',
  logLevel: env.get('LOG_LEVEL').default('info').asString(),
  databaseUrl: env.get('DATABASE_URL').required().asUrlString(),
  authSecret: env.get('AUTH_SECRET').required().asString(),
  frontendUrl: env.get('FRONTEND_URL').default('http://localhost:5173').asUrlString(),
}
