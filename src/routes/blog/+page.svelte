<script>
  export let data;
  const { posts, title, description, ogImage, icons } = data;

  // Get category, icon, and thumbnail image based on post slug
  // Order matters: more specific patterns checked first to avoid mis-categorization
  // e.g., archive must come before image because 'webpage' contains 'webp'
  function getPostCategory(slug) {
    // Archive and recovery - check FIRST to prevent false matches
    // ('recover-deleted-webpage' would match 'webp' in image otherwise)
    if (slug.includes('wayback') || slug.includes('archive') || slug.includes('recover') ||
        slug.includes('time-machine')) {
      return { category: 'archive', icon: '⏪', thumb: '/blog/archive-category.jpg' };
    }
    // Privacy-focused
    if (slug.includes('privacy')) {
      return { category: 'privacy', icon: '🔒', thumb: '/blog/privacy-category.jpg' };
    }
    // Document conversion - with sub-categories for variety
    if (slug.includes('pdf') || slug.includes('docx') || slug.includes('markdown') ||
        slug.includes('html-to') || slug.includes('latex') || slug.includes('epub') ||
        slug.includes('odt') || slug.includes('rtf') || slug.includes('word') ||
        slug.includes('document') || slug.includes('extract-text')) {
      // Sub-categorize for visual variety
      if (slug.includes('pdf')) {
        return { category: 'document', icon: '📄', thumb: '/blog/doc-pdf.jpg' };
      }
      if (slug.includes('markdown')) {
        return { category: 'document', icon: '📝', thumb: '/blog/doc-markdown.jpg' };
      }
      if (slug.includes('docx') || slug.includes('word')) {
        return { category: 'document', icon: '📃', thumb: '/blog/doc-word.jpg' };
      }
      if (slug.includes('epub')) {
        return { category: 'document', icon: '📖', thumb: '/blog/doc-epub.jpg' };
      }
      if (slug.includes('latex')) {
        return { category: 'document', icon: '📐', thumb: '/blog/doc-latex.jpg' };
      }
      // ODT, RTF, TXT, HTML fallback
      return { category: 'document', icon: '📄', thumb: '/blog/doc-text.jpg' };
    }
    // SEO and site management
    if (slug.includes('broken-link') || slug.includes('sitemap') || slug.includes('seo') ||
        slug.includes('redirect') || slug.includes('migration')) {
      return { category: 'seo', icon: '🔍', thumb: '/blog/seo-category.jpg' };
    }
    // Image-related posts (format conversions, compression)
    if (slug.includes('heic') || slug.includes('webp') || slug.includes('png') ||
        slug.includes('jpg') || slug.includes('jpeg') || slug.includes('gif') ||
        slug.includes('compress') || slug.includes('image') || slug.includes('batch')) {
      // Sub-categorize for visual variety (check gif before webp since gif-to-webp is about GIF)
      if (slug.includes('heic')) {
        return { category: 'image', icon: '📱', thumb: '/blog/img-heic.jpg' };
      }
      if (slug.includes('gif')) {
        return { category: 'image', icon: '🎞️', thumb: '/blog/img-gif.jpg' };
      }
      if (slug.includes('webp')) {
        return { category: 'image', icon: '🌐', thumb: '/blog/img-webp.jpg' };
      }
      if (slug.includes('compress') || slug.includes('batch') || slug.includes('optimize')) {
        return { category: 'image', icon: '⚡', thumb: '/blog/img-compress.jpg' };
      }
      // PNG/JPG fallback
      return { category: 'image', icon: '🖼️', thumb: '/blog/img-photo.jpg' };
    }
    // Default fallback
    return { category: 'general', icon: '🛠️', thumb: '/blog/general-category.jpg' };
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
    height: 160px;
    position: relative;
    overflow: hidden;
    background: var(--surface-elevated);
  }

  .blog-card-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
  }

  .blog-card:hover .blog-card-thumb img {
    transform: scale(1.05);
  }

  .blog-card-icon {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 2.5rem;
    filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.4));
    z-index: 1;
  }

  .blog-card-category {
    position: absolute;
    bottom: 8px;
    right: 12px;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #fff;
    background: rgba(0, 0, 0, 0.5);
    padding: 3px 10px;
    border-radius: 4px;
    z-index: 1;
    backdrop-filter: blur(4px);
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
