import type { APIRoute } from 'astro'

const productionRobotsTxt = `\
User-agent: *
Disallow: /dist/
`

const getRobotsTxt = (site?: URL) => `${productionRobotsTxt}${site ? `Sitemap: ${new URL('sitemap-index.xml', site).href}\n` : ''}`

export const GET: APIRoute = ({ site }) => {
  return new Response(getRobotsTxt(site))
}
