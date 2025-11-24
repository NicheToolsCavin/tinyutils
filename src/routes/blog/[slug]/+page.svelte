<script>
  export let data;
  const {
    title,
    description,
    outline,
    ctaTitle,
    ctaText,
    ctaLink,
    ctaLinkText,
    ogImage,
    icons,
    slug
  } = data;

  const publishedMeta = 'Published: Coming Soon · Updated: 2025';
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  <link rel="canonical" href={`/blog/${slug}/`} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:type" content="article" />
  <meta property="og:image" content={ogImage} />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="icon" href={icons.dark} media="(prefers-color-scheme: dark)" />
  <link rel="icon" href={icons.light} media="(prefers-color-scheme: light)" />
  <link rel="icon" type="image/png" sizes="32x32" href={icons.dark} />
  <link rel="apple-touch-icon" sizes="180x180" href="/icons/tinyutils-icon-light-180.png" />
</svelte:head>

<div class="blog-article">
  <article class="container">
    <header class="article-hero">
      <h1>{title}</h1>
      <div class="article-meta">{publishedMeta}</div>
    </header>

    <section class="article-content card">
      <div class="placeholder-notice">
        <h2>Outline</h2>
        {#if outline}
          <div class="outline">{@html outline}</div>
        {:else}
          <p>Outline coming soon.</p>
        {/if}
      </div>

      <div class="cta-box">
        <h3>{ctaTitle}</h3>
        <p>{ctaText}</p>
        <a href={ctaLink}>{ctaLinkText}</a>
      </div>
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

  .placeholder-notice {
    background: var(--surface-elevated);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-xl);
    padding: var(--space-6);
    margin: var(--space-8) 0;
    text-align: center;
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
