import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { databaseService } from './database.js'
import { configs } from '../configs.js'

// Sitemap + robots so the rebuild keeps the site's search presence. Lists every
// public problem, contest and blog by its canonical (legacy-preserved) URL.
export const seoController: FastifyPluginAsyncZod = async (app) => {
  app.get('/robots.txt', { config: { security: 'public' } }, async (_req, reply) => {
    reply.type('text/plain').send(`User-agent: *\nAllow: /\nSitemap: ${configs.frontendUrl.replace(/\/+$/, "")}/sitemap.xml\n`)
  })

  app.get('/sitemap.xml', { config: { security: 'public' } }, async (_req, reply) => {
    const db = databaseService.db()
    const base = configs.frontendUrl.replace(//+$/, "")
    const urls: string[] = [base + '/', base + '/problemset/page/1', base + '/contests', base + '/leaderboard/page/1', base + '/forum']
    const problems = await db.selectFrom('problem').select('slug').where('visibility', '=', 'public').execute()
    for (const p of problems) urls.push(`${base}/problem/${p.slug}`)
    const contests = await db.selectFrom('contest').select('slug').where('visibility', '=', 'public').execute()
    for (const c of contests) urls.push(`${base}/contest/${c.slug}/scoreboard/page/1`)
    const blogs = await db.selectFrom('blog').select('id').where('visibility', '<>', 'deleted').execute()
    for (const b of blogs) urls.push(`${base}/blog/${b.id}`)
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`
    reply.type('application/xml').send(xml)
  })
}
