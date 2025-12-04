import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      runtime: 'nodejs22.x',
      // Exclude Python API routes from SvelteKit - let Vercel handle them directly
      external: ['/api/convert', '/api/bulk-replace']
    }),
    prerender: {
      entries: ['*'],
      handleHttpError: 'warn'
    }
  },
  // Use "ignore" so both `/tools` and `/tools/` (and subpaths)
  // resolve without internal 308 redirects during preview smokes.
  trailingSlash: 'ignore'
};

export default config;
