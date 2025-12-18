<script>
  export let data;
  const { posts, title, description, ogImage, icons } = data;

  // Get category based on post slug
  // Each post has its own unique thumbnail at /blog/posts/{slug}.jpg
  function getPostCategory(slug) {
    const thumb = `/blog/posts/${slug}.jpg`;

    // Archive and recovery - check FIRST to prevent false matches
    if (slug.includes('wayback') || slug.includes('archive') || slug.includes('recover') ||
        slug.includes('time-machine')) {
      return { category: 'archive', thumb };
    }
    if (slug.includes('privacy')) {
      return { category: 'privacy', thumb };
    }
    if (slug.includes('pdf') || slug.includes('docx') || slug.includes('markdown') ||
        slug.includes('html-to') || slug.includes('latex') || slug.includes('epub') ||
        slug.includes('odt') || slug.includes('rtf') || slug.includes('word') ||
        slug.includes('document') || slug.includes('extract-text')) {
      return { category: 'document', thumb };
    }
    if (slug.includes('broken-link') || slug.includes('sitemap') || slug.includes('seo') ||
        slug.includes('redirect') || slug.includes('migration')) {
      return { category: 'seo', thumb };
    }
    if (slug.includes('heic') || slug.includes('webp') || slug.includes('png') ||
        slug.includes('jpg') || slug.includes('jpeg') || slug.includes('gif') ||
        slug.includes('compress') || slug.includes('image') || slug.includes('batch')) {
      return { category: 'image', thumb };
    }
    return { category: 'general', thumb };
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
          <div class="blog-card-thumb">
            <img src={cat.thumb} alt="{cat.category} category thumbnail" loading="lazy" />
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
  /* ═══════════════════════════════════════════════════════════
     LIQUID GLASS BLOG INDEX
     ═══════════════════════════════════════════════════════════ */

  .blog-page {
    padding-bottom: var(--space-16);
  }

  .blog-hero {
    text-align: center;
    padding: var(--space-16) var(--space-4) var(--space-10);
  }

  .blog-hero h1 {
    font-size: clamp(2.5rem, 5vw, 3.5rem);
    font-weight: var(--font-bold);
    background: var(--accent-gradient);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: var(--space-4);
    letter-spacing: -0.02em;
  }

  .blog-hero-subtitle {
    font-size: var(--text-lg);
    color: var(--text-secondary);
    max-width: 600px;
    margin: 0 auto;
    line-height: 1.7;
  }

  .blog-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(320px, 100%), 1fr));
    gap: var(--space-6);
    margin-top: var(--space-10);
  }

  /* Glass blog card */
  .blog-card {
    position: relative;
    background: var(--glass-bg);
    backdrop-filter: blur(var(--glass-blur));
    -webkit-backdrop-filter: blur(var(--glass-blur));
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-2xl);
    overflow: hidden;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    flex-direction: column;
  }

  .blog-card:hover {
    transform: translateY(-8px);
    border-color: var(--accent-primary);
    box-shadow: 0 20px 60px var(--glass-shadow);
  }

  .blog-card-thumb {
    height: 180px;
    position: relative;
    overflow: hidden;
  }

  .blog-card-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.5s ease;
  }

  .blog-card:hover .blog-card-thumb img {
    transform: scale(1.08);
  }

  /* Glass category badge */
  .blog-card-category {
    position: absolute;
    bottom: 12px;
    right: 12px;
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #fff;
    background: var(--glass-bg);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    padding: 5px 12px;
    border-radius: var(--radius-full);
    border: 1px solid rgba(255, 255, 255, 0.2);
    z-index: 1;
  }

  .blog-card-content {
    padding: var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    flex: 1;
    position: relative;
  }

  /* Shine overlay on content */
  .blog-card-content::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--glass-highlight), transparent);
    opacity: 0.5;
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
    line-height: 1.65;
    flex: 1;
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .blog-card a {
    color: var(--accent-primary);
    text-decoration: none;
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    margin-top: auto;
    transition: all 0.2s ease;
  }

  .blog-card a:hover {
    color: var(--accent-secondary);
    text-decoration: underline;
  }

  /* Light mode enhancements */
  :global(html[data-theme="light"]) .blog-card {
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06),
                inset 0 1px 0 rgba(255, 255, 255, 0.9);
  }

  :global(html[data-theme="light"]) .blog-card:hover {
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1),
                inset 0 1px 0 rgba(255, 255, 255, 0.9);
  }

  :global(html[data-theme="light"]) .blog-card-category {
    background: rgba(255, 255, 255, 0.8);
    color: var(--text-primary);
    border-color: rgba(255, 255, 255, 0.5);
  }

  /* Responsive */
  @media (max-width: 768px) {
    .blog-hero {
      padding: var(--space-10) var(--space-4) var(--space-6);
    }

    .blog-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
