import { error } from '@sveltejs/kit';
import { posts } from '../postData.js';

export const prerender = true;

export function load({ params }) {
  const post = posts[params.slug];
  if (!post) throw error(404, 'Not found');

  return {
    slug: params.slug,
    ...post,
    ogImage: '/og.png',
    icons: {
      dark: '/icons/tinyutils-icon-dark-32.png',
      light: '/icons/tinyutils-icon-light-32.png'
    }
  };
}
