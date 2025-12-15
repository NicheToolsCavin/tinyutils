import { error } from '@sveltejs/kit';
import { posts } from '../postData.js';

export const prerender = true;

const SITE_ORIGIN = 'https://tinyutils.net';

function toJsonLd(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export function load({ params }) {
  const post = posts[params.slug];
  if (!post) throw error(404, 'Not found');

  const canonicalUrl = `${SITE_ORIGIN}/blog/${params.slug}/`;
  const schema = {
    '@context': 'https://schema.org',
    '@type': post.schemaType ?? 'BlogPosting',
    headline: post.title,
    description: post.description,
    url: canonicalUrl,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl
    },
    image: [`${SITE_ORIGIN}/og.png`],
    datePublished: post.published,
    dateModified: post.updated,
    author: {
      '@type': 'Organization',
      name: 'TinyUtils'
    },
    publisher: {
      '@type': 'Organization',
      name: 'TinyUtils',
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_ORIGIN}/logo.svg`
      }
    }
  };

  return {
    slug: params.slug,
    ...post,
    canonicalUrl,
    schemaJsonLd: toJsonLd(schema),
    ogImage: '/og.png',
    icons: {
      dark: '/icons/tinyutils-icon-dark-32.png',
      light: '/icons/tinyutils-icon-light-32.png'
    }
  };
}
