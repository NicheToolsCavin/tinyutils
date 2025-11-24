<script>
  export let data;
  const { posts, title, description, ogImage, icons } = data;
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  <link rel="canonical" href="/blog/" />
  <meta property="og:title" content={title} />
  <meta property="og:description" content="SEO guides, tutorials, and case studies." />
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
        SEO guides, tutorials, and case studies about broken links, document conversion, Wayback Machine,
        and web migration strategies.
      </p>
    </div>

    <div class="blog-grid">
      {#each posts as post}
        <article class="blog-card">
          <h3>{post.title}</h3>
          <p>{post.description}</p>
          <a href={`/blog/${post.slug}/`}>Read more →</a>
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
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: var(--space-6);
    margin-top: var(--space-8);
  }

  .blog-card {
    background: var(--surface-base);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-2xl);
    padding: var(--space-6);
    transition: all var(--transition-base);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .blog-card:hover {
    transform: translateY(-4px);
    border-color: var(--hover-accent);
    box-shadow: 0 12px 40px var(--hover-shadow-color);
  }

  .blog-card h3 {
    font-size: var(--text-xl);
    font-weight: var(--font-semibold);
    color: var(--text-primary);
    line-height: 1.4;
  }

  .blog-card p {
    color: var(--text-secondary);
    font-size: var(--text-sm);
    line-height: 1.6;
    flex: 1;
  }

  .blog-card a {
    color: var(--brand);
    text-decoration: none;
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
  }

  .blog-card a:hover {
    text-decoration: underline;
  }
</style>
