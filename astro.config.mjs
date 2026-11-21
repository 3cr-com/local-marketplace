// @ts-check

import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

const site = process.env.PUBLIC_SITE_URL;

// https://astro.build/config
const config = {
  // Pages build as about/index.html, and the sitemap and canonical tag list
  // /about/; webproxy 301s /about there, so keep every URL on the slash form.
  trailingSlash: 'always',
  integrations: [react()],
  vite: {
      plugins: [tailwindcss()],
  },
  ...(site ? { site, integrations: [react(), sitemap({ lastmod: new Date() })] } : {})
};

// https://astro.build/config
export default defineConfig(config)
