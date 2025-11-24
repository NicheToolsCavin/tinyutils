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
      'SEO guides, tutorials, and case studies about broken links, document conversion, Wayback Machine, and web migration strategies.',
    title: 'Blog — TinyUtils'
  };
}
