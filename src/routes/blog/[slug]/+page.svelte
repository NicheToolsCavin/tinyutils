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
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  <link rel="canonical" href={canonicalUrl ?? `/blog/${slug}/`} />
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
  <article class="container">
    <header class="article-hero">
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
  .article-hero {
    text-align: center;
    padding: var(--space-12) 0 var(--space-8);
    max-width: 800px;
    margin: 0 auto;
  }

  .article-hero h1 {
    font-size: var(--text-4xl);
    font-weight: var(--font-bold);
    background: var(--gradient-brand);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: var(--space-3);
  }

  .article-meta {
    color: var(--text-tertiary);
    font-size: var(--text-sm);
    margin-bottom: var(--space-6);
  }

  .article-content {
    max-width: 800px;
    margin: 0 auto;
    padding: var(--space-8) var(--space-4);
    line-height: 1.8;
  }

  .toc {
    background: var(--surface-elevated);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-xl);
    padding: var(--space-5);
    margin: 0 0 var(--space-8);
  }

  .toc h2 {
    margin: 0 0 var(--space-3);
    font-size: var(--text-lg);
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

  .article-body :global(h2) {
    margin-top: var(--space-10);
    margin-bottom: var(--space-4);
    font-size: var(--text-2xl);
    font-weight: var(--font-semibold);
    letter-spacing: -0.01em;
  }

  .article-body :global(h3) {
    margin-top: var(--space-8);
    margin-bottom: var(--space-3);
    font-size: var(--text-xl);
    font-weight: var(--font-semibold);
  }

  .article-body :global(p) {
    margin-bottom: var(--space-4);
    color: var(--text-secondary);
  }

  .article-body :global(ul),
  .article-body :global(ol) {
    margin-bottom: var(--space-4);
    padding-left: var(--space-6);
    color: var(--text-secondary);
  }

  .article-body :global(li) {
    margin-bottom: var(--space-2);
  }

  .article-body :global(code) {
    background: var(--surface-elevated);
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    font-size: 0.9em;
  }

  .article-body :global(pre) {
    background: var(--surface-elevated);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    padding: var(--space-4);
    overflow: auto;
    margin: var(--space-5) 0;
  }

  .article-body :global(pre code) {
    background: transparent;
    padding: 0;
  }

  .article-body :global(a) {
    color: var(--brand);
    text-decoration: none;
  }

  .article-body :global(a:hover) {
    text-decoration: underline;
  }

  .article-body :global(blockquote) {
    border-left: 4px solid var(--border-default);
    padding-left: var(--space-4);
    margin: var(--space-6) 0;
    color: var(--text-secondary);
  }

  .article-body :global(table) {
    width: 100%;
    border-collapse: collapse;
    margin: var(--space-6) 0;
  }

  .article-body :global(th),
  .article-body :global(td) {
    padding: var(--space-3) var(--space-4);
    text-align: left;
    border-bottom: 1px solid var(--border-default);
    vertical-align: top;
  }

  .article-body :global(th) {
    background: var(--surface-elevated);
    font-weight: var(--font-semibold);
  }

  .article-body :global(hr) {
    border: none;
    border-top: 1px solid var(--border-default);
    margin: var(--space-8) 0;
  }

  .cta-box {
    background: var(--surface-elevated);
    border: 2px solid var(--brand-500);
    border-radius: var(--radius-xl);
    padding: var(--space-6);
    margin: var(--space-8) 0;
    text-align: center;
  }

  .cta-box a {
    display: inline-block;
    margin-top: var(--space-4);
    padding: 12px 24px;
    background: var(--gradient-brand);
    color: white;
    border-radius: var(--radius-full);
    text-decoration: none;
    font-weight: 600;
  }

  .cta-box a:hover {
    filter: brightness(1.05);
  }
</style>
