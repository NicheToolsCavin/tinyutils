<script>
  export let data;
  const {
    title,
    description,
    outline,
    content,
    ctaTitle,
    ctaText,
    ctaLink,
    ctaLinkText,
    published,
    updated,
    canonicalUrl,
    schemaJsonLd,
    ogImage,
    icons,
    slug
  } = data;

  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  const publishedLabel = published ? dateFormatter.format(new Date(published)) : null;
  const updatedLabel = updated ? dateFormatter.format(new Date(updated)) : null;

  // Get category based on slug - each post has unique thumbnail at /blog/posts/{slug}.jpg
  function getCategory(s) {
    if (s.includes('wayback') || s.includes('archive') || s.includes('recover') || s.includes('time-machine')) {
      return 'archive';
    }
    if (s.includes('privacy')) return 'privacy';
    if (s.includes('pdf') || s.includes('docx') || s.includes('markdown') || s.includes('html-to') ||
        s.includes('latex') || s.includes('epub') || s.includes('odt') || s.includes('rtf') ||
        s.includes('word') || s.includes('document') || s.includes('extract-text')) {
      return 'document';
    }
    if (s.includes('broken-link') || s.includes('sitemap') || s.includes('seo') ||
        s.includes('redirect') || s.includes('migration')) {
      return 'seo';
    }
    if (s.includes('heic') || s.includes('webp') || s.includes('png') || s.includes('jpg') ||
        s.includes('jpeg') || s.includes('gif') || s.includes('compress') || s.includes('image') ||
        s.includes('batch')) {
      return 'image';
    }
    return 'general';
  }

  const category = getCategory(slug);
  const thumb = `/blog/posts/${slug}.jpg`;
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  <link rel="canonical" href={canonicalUrl ?? `/blog/${slug}/`} />
  <!-- Preload hero image for faster LCP -->
  <link rel="preload" as="image" href={thumb} fetchpriority="high" />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:type" content="article" />
  <meta property="og:image" content={ogImage} />
  <meta property="og:site_name" content="TinyUtils" />
  {#if published}
    <meta property="article:published_time" content={published} />
  {/if}
  {#if updated}
    <meta property="article:modified_time" content={updated} />
  {/if}
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="icon" href={icons.dark} media="(prefers-color-scheme: dark)" />
  <link rel="icon" href={icons.light} media="(prefers-color-scheme: light)" />
  <link rel="icon" type="image/png" sizes="32x32" href={icons.dark} />
  <link rel="apple-touch-icon" sizes="180x180" href="/icons/tinyutils-icon-light-180.png" />
  {@html schemaJsonLd ? `<script type="application/ld+json">${schemaJsonLd}</script>` : ''}
</svelte:head>

<div class="blog-article">
  <div class="article-hero-image">
    <img
      src={thumb}
      alt="{category} category"
      fetchpriority="high"
      width="1200"
      height="320"
    />
    <div class="article-hero-overlay"></div>
  </div>
  <article class="container">
    <header class="article-hero">
      <span class="article-category">{category}</span>
      <h1>{title}</h1>
      <div class="article-meta">
        {#if publishedLabel}
          <span>Published {publishedLabel}</span>
        {/if}
        {#if updatedLabel && updatedLabel !== publishedLabel}
          <span> · Updated {updatedLabel}</span>
        {/if}
      </div>
    </header>

    <section class="article-content card">
      {#if outline}
        <aside class="toc">
          <h2>Quick map</h2>
          <div class="toc-body">{@html outline}</div>
        </aside>
      {/if}

      <div class="article-body">{@html content}</div>

      {#if ctaTitle && ctaLink}
        <div class="cta-box">
          <h3>{ctaTitle}</h3>
          <p>{ctaText}</p>
          <a href={ctaLink}>{ctaLinkText}</a>
        </div>
      {/if}
    </section>
  </article>
</div>

<style>
  /* ═══════════════════════════════════════════════════════════
     LIQUID GLASS BLOG ARTICLE
     ═══════════════════════════════════════════════════════════ */

  .blog-article {
    padding-bottom: var(--space-16);
  }

  .article-hero-image {
    position: relative;
    width: 100%;
    height: 320px;
    overflow: hidden;
  }

  .article-hero-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .article-hero-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(to bottom, transparent 0%, var(--bg-base) 100%);
  }

  /* Glass category badge */
  .article-category {
    display: inline-block;
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--accent-primary);
    background: var(--glass-bg);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid var(--glass-border);
    padding: 6px 14px;
    border-radius: var(--radius-full);
    margin-bottom: var(--space-4);
  }

  .article-hero {
    text-align: center;
    padding: var(--space-8) 0 var(--space-6);
    max-width: 800px;
    margin: 0 auto;
    margin-top: -80px;
    position: relative;
  }

  .article-hero h1 {
    font-size: clamp(2rem, 5vw, 3rem);
    font-weight: var(--font-bold);
    background: var(--accent-gradient);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: var(--space-4);
    letter-spacing: -0.02em;
    line-height: 1.2;
  }

  .article-meta {
    color: var(--text-tertiary);
    font-size: var(--text-sm);
    margin-bottom: var(--space-6);
  }

  /* Glass article content container */
  .article-content {
    position: relative;
    max-width: 800px;
    margin: 0 auto;
    background: var(--glass-bg);
    backdrop-filter: blur(var(--glass-blur));
    -webkit-backdrop-filter: blur(var(--glass-blur));
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-2xl);
    padding: var(--space-10) var(--space-8);
    line-height: 1.8;
    overflow: hidden;
  }

  .article-content::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--glass-highlight), transparent);
    opacity: 0.6;
  }

  .article-content::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 40%;
    background: var(--glass-shine);
    pointer-events: none;
    opacity: 0.3;
  }

  /* Glass TOC box */
  .toc {
    position: relative;
    background: var(--glass-bg);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-xl);
    padding: var(--space-6);
    margin: 0 0 var(--space-10);
    z-index: 1;
  }

  .toc h2 {
    margin: 0 0 var(--space-4);
    font-size: var(--text-lg);
    color: var(--text-primary);
  }

  .toc-body :global(p) {
    margin: 0 0 var(--space-3);
    color: var(--text-secondary);
  }

  .toc-body :global(ul),
  .toc-body :global(ol) {
    margin: 0 0 var(--space-3);
    padding-left: var(--space-6);
    color: var(--text-secondary);
  }

  .toc-body :global(li) {
    margin-bottom: var(--space-2);
  }

  .toc-body :global(a) {
    color: var(--accent-primary);
    text-decoration: none;
  }

  .toc-body :global(a:hover) {
    text-decoration: underline;
  }

  /* Article body typography */
  .article-body {
    position: relative;
    z-index: 1;
  }

  .article-body :global(h2) {
    margin-top: var(--space-12);
    margin-bottom: var(--space-4);
    font-size: var(--text-2xl);
    font-weight: var(--font-semibold);
    color: var(--text-primary);
    letter-spacing: -0.01em;
  }

  .article-body :global(h3) {
    margin-top: var(--space-8);
    margin-bottom: var(--space-3);
    font-size: var(--text-xl);
    font-weight: var(--font-semibold);
    color: var(--text-primary);
  }

  .article-body :global(p) {
    margin-bottom: var(--space-5);
    color: var(--text-secondary);
    line-height: 1.8;
  }

  .article-body :global(ul),
  .article-body :global(ol) {
    margin-bottom: var(--space-5);
    padding-left: var(--space-6);
    color: var(--text-secondary);
  }

  .article-body :global(li) {
    margin-bottom: var(--space-2);
    line-height: 1.7;
  }

  /* Glass code blocks */
  .article-body :global(code) {
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    padding: 3px 8px;
    border-radius: var(--radius-md);
    font-size: 0.88em;
  }

  .article-body :global(pre) {
    background: var(--glass-bg);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-xl);
    padding: var(--space-5);
    overflow: auto;
    margin: var(--space-6) 0;
  }

  .article-body :global(pre code) {
    background: transparent;
    border: none;
    padding: 0;
  }

  .article-body :global(a) {
    color: var(--accent-primary);
    text-decoration: none;
    font-weight: var(--font-medium);
  }

  .article-body :global(a:hover) {
    text-decoration: underline;
    color: var(--accent-secondary);
  }

  .article-body :global(blockquote) {
    border-left: 4px solid var(--accent-primary);
    padding-left: var(--space-5);
    margin: var(--space-8) 0;
    color: var(--text-secondary);
    font-style: italic;
  }

  /* Glass tables */
  .article-body :global(table) {
    width: 100%;
    border-collapse: collapse;
    margin: var(--space-6) 0;
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  .article-body :global(th),
  .article-body :global(td) {
    padding: var(--space-3) var(--space-4);
    text-align: left;
    border-bottom: 1px solid var(--glass-border);
    vertical-align: top;
  }

  .article-body :global(th) {
    background: var(--glass-bg-hover);
    font-weight: var(--font-semibold);
    color: var(--text-primary);
  }

  .article-body :global(hr) {
    border: none;
    border-top: 1px solid var(--glass-border);
    margin: var(--space-10) 0;
  }

  /* Glass CTA box */
  .cta-box {
    position: relative;
    background: var(--glass-bg);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 2px solid var(--accent-primary);
    border-radius: var(--radius-2xl);
    padding: var(--space-8);
    margin: var(--space-10) 0;
    text-align: center;
    z-index: 1;
    overflow: hidden;
  }

  .cta-box::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 50%;
    background: var(--glass-shine);
    pointer-events: none;
    opacity: 0.4;
  }

  .cta-box h3 {
    position: relative;
    z-index: 1;
    margin: 0 0 var(--space-3);
    color: var(--text-primary);
  }

  .cta-box p {
    position: relative;
    z-index: 1;
    margin: 0;
    color: var(--text-secondary);
  }

  .cta-box a {
    position: relative;
    z-index: 1;
    display: inline-block;
    margin-top: var(--space-5);
    padding: 14px 28px;
    background: var(--accent-gradient);
    color: white;
    border-radius: var(--radius-full);
    text-decoration: none;
    font-weight: 600;
    box-shadow: 0 4px 20px rgba(59, 130, 246, 0.4);
    transition: all 0.3s ease;
  }

  .cta-box a:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 30px rgba(59, 130, 246, 0.5);
  }

  /* Light mode enhancements */
  :global(html[data-theme="light"]) .article-content {
    box-shadow: 0 4px 40px rgba(0, 0, 0, 0.08),
                inset 0 1px 0 rgba(255, 255, 255, 0.9);
  }

  :global(html[data-theme="light"]) .article-content::after {
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.6) 0%, transparent 100%);
    opacity: 1;
  }

  :global(html[data-theme="light"]) .toc {
    box-shadow: 0 2px 16px rgba(0, 0, 0, 0.05),
                inset 0 1px 0 rgba(255, 255, 255, 0.9);
  }

  :global(html[data-theme="light"]) .cta-box {
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08),
                inset 0 1px 0 rgba(255, 255, 255, 0.9);
  }

  :global(html[data-theme="light"]) .cta-box::after {
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.7) 0%, transparent 100%);
    opacity: 1;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .article-hero-image {
      height: 220px;
    }

    .article-hero {
      margin-top: -60px;
      padding: var(--space-6) var(--space-4);
    }

    .article-content {
      padding: var(--space-6) var(--space-4);
      border-radius: var(--radius-xl);
    }

    .toc {
      padding: var(--space-4);
    }

    .cta-box {
      padding: var(--space-6);
    }
  }
</style>
