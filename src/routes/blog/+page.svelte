<script>
  export let data;
  const { posts, title, description, ogImage, icons } = data;

  // Get category and icon based on post slug
  // Order matters: more specific patterns checked first to avoid mis-categorization
  function getPostCategory(slug) {
    // Image-related posts (format conversions, compression)
    if (slug.includes('heic') || slug.includes('webp') || slug.includes('png') ||
        slug.includes('jpg') || slug.includes('jpeg') || slug.includes('gif') ||
        slug.includes('compress') || slug.includes('image') || slug.includes('batch-image')) {
      return { category: 'image', icon: '🖼️' };
    }
    // Document conversion and extraction
    if (slug.includes('pdf') || slug.includes('docx') || slug.includes('markdown') ||
        slug.includes('html-to') || slug.includes('latex') || slug.includes('epub') ||
        slug.includes('odt') || slug.includes('rtf') || slug.includes('word') ||
        slug.includes('document') || slug.includes('extract-text')) {
      return { category: 'document', icon: '📄' };
    }
    // SEO and site management
    if (slug.includes('broken-link') || slug.includes('sitemap') || slug.includes('seo') ||
        slug.includes('redirect') || slug.includes('migration')) {
      return { category: 'seo', icon: '🔍' };
    }
    // Archive and recovery
    if (slug.includes('wayback') || slug.includes('archive') || slug.includes('recover') ||
        slug.includes('time-machine')) {
      return { category: 'archive', icon: '⏪' };
    }
    // Privacy-focused
    if (slug.includes('privacy')) {
      return { category: 'privacy', icon: '🔒' };
    }
    // Default fallback
    return { category: 'general', icon: '🛠️' };
  }
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  <link rel="canonical" href="/blog/" />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:type" content="website" />
  <meta property="og:image" content={ogImage} />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="icon" href={icons.dark} media="(prefers-color-scheme: dark)" />
  <link rel="icon" href={icons.light} media="(prefers-color-scheme: light)" />
  <link rel="icon" type="image/png" sizes="32x32" href={icons.dark} />
  <link rel="apple-touch-icon" sizes="180x180" href="/icons/tinyutils-icon-light-180.png" />
</svelte:head>

<div class="blog-page">
  <div class="container">
    <div class="blog-hero">
      <h1>Blog</h1>
      <p class="blog-hero-subtitle">
        Practical guides about image compression, broken links, document conversion, the Wayback Machine,
        and website migrations — written to be useful, not fluffy.
      </p>
    </div>

    <div class="blog-grid">
      {#each posts as post}
        {@const cat = getPostCategory(post.slug)}
        <article class="blog-card">
          <div class="blog-card-thumb blog-card-thumb--{cat.category}">
            <span class="blog-card-icon" role="img" aria-label="{cat.category} category">{cat.icon}</span>
            <span class="blog-card-category">{cat.category}</span>
          </div>
          <div class="blog-card-content">
            <h3>{post.title}</h3>
            <p>{post.description}</p>
            <a href={`/blog/${post.slug}/`}>Read more →</a>
          </div>
        </article>
      {/each}
    </div>
  </div>
</div>

<style>
  .blog-hero {
    text-align: center;
    padding: var(--space-16) var(--space-4) var(--space-12);
  }

  .blog-hero h1 {
    font-size: var(--text-4xl);
    font-weight: var(--font-bold);
    background: var(--gradient-brand);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: var(--space-3);
  }

  .blog-hero-subtitle {
    font-size: var(--text-lg);
    color: var(--text-secondary);
    max-width: 600px;
    margin: 0 auto;
  }

  .blog-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr));
    gap: var(--space-6);
    margin-top: var(--space-8);
  }

  .blog-card {
    background: var(--surface-base);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-2xl);
    overflow: hidden;
    transition: all var(--transition-base);
    display: flex;
    flex-direction: column;
  }

  .blog-card:hover {
    transform: translateY(-4px);
    border-color: var(--hover-accent);
    box-shadow: 0 12px 40px var(--hover-shadow-color);
  }

  .blog-card-thumb {
    height: 140px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
  }

  /* Category-specific gradient backgrounds (CSP-safe) */
  .blog-card-thumb--image {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }

  .blog-card-thumb--document {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  }

  .blog-card-thumb--seo {
    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  }

  .blog-card-thumb--archive {
    background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
  }

  .blog-card-thumb--privacy {
    background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
  }

  .blog-card-thumb--general {
    background: linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%);
  }

  .blog-card-icon {
    font-size: 3rem;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
  }

  .blog-card-category {
    position: absolute;
    bottom: 8px;
    right: 12px;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: rgba(255, 255, 255, 0.9);
    background: rgba(0, 0, 0, 0.2);
    padding: 2px 8px;
    border-radius: 4px;
  }

  .blog-card-content {
    padding: var(--space-5);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    flex: 1;
  }

  .blog-card h3 {
    font-size: var(--text-lg);
    font-weight: var(--font-semibold);
    color: var(--text-primary);
    line-height: 1.4;
    margin: 0;
  }

  .blog-card p {
    color: var(--text-secondary);
    font-size: var(--text-sm);
    line-height: 1.6;
    flex: 1;
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .blog-card a {
    color: var(--brand);
    text-decoration: none;
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    margin-top: auto;
  }

  .blog-card a:hover {
    text-decoration: underline;
  }
</style>
