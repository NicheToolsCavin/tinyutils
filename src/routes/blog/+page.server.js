import { posts, postList } from './postData.js';

export const prerender = true;

export function load() {
  return {
    posts: postList,
    ogImage: '/og.png',
    icons: {
      dark: '/icons/tinyutils-icon-dark-32.png',
      light: '/icons/tinyutils-icon-light-32.png'
    },
    description:
      'Practical guides about image compression, broken links, document conversion, the Wayback Machine, and website migrations.',
    title: 'Blog — TinyUtils'
  };
}
