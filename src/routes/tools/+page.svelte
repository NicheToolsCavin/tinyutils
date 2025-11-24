<script>
  const seoTools = [
    {
      icon: '🔍',
      name: 'Dead Link Finder',
      href: '/tools/dead-link-finder/',
      tier: 'free',
      description:
        'Scan any page, list, or sitemap for broken links. Get status codes, redirect chains, and CSV/JSON exports.',
      badges: ['Robots-aware', 'Redirect chains', 'HSTS guard', 'Wayback links']
    },
    {
      icon: '🗺️',
      name: 'Sitemap Delta',
      href: '/tools/sitemap-delta/',
      tier: 'free',
      description:
        'Compare two sitemaps to see what changed. Perfect for migrations and release audits.',
      badges: ['XML & XML.GZ', 'Added/removed flags', 'Redirect planning']
    },
    {
      icon: '🕰️',
      name: 'Wayback Fixer',
      href: '/tools/wayback-fixer/',
      tier: 'free',
      description:
        'Turn Wayback Machine exports into clean redirect maps for your new site.',
      badges: ['Wayback export', 'Redirect suggestions', 'SEO-safe']
    }
  ];

  const documentTools = [
    {
      icon: '📄',
      name: 'Document Converter',
      href: '/tools/text-converter/',
      tier: 'pro',
      description:
        'Convert between 100+ document formats powered by Pandoc. Markdown, PDF, DOCX, HTML, RTF, ODT, LaTeX, and more.',
      badges: ['100+ formats', 'Chromium PDF', 'Pandoc engine', 'Batch-friendly']
    }
  ];
</script>

<svelte:head>
  <title>Tools — TinyUtils</title>
  <meta
    name="description"
    content="Free web tools for light-side SEOs and builders: Dead Link Finder, Sitemap Delta, Wayback Fixer, and a Pro document converter (100+ formats)."
  />
  <link rel="canonical" href="/tools/" />
</svelte:head>

<section class="hero-tools">
  <div class="container">
    <h1 class="hero-title">Tools</h1>
    <p class="hero-subtitle">
      Fast, polite, privacy‑friendly utilities for SEOs, engineers, and site owners. No
      logins. No dark patterns.
    </p>
  </div>
</section>

<section class="tools-section">
  <div class="container">
    <header class="tools-section-header">
      <h2 class="tools-section-title">SEO &amp; Site Management</h2>
      <p class="tools-section-description">
        Find broken links, compare sitemaps, and map URLs to archive snapshots.
      </p>
    </header>
    <div class="tools-grid">
      {#each seoTools as tool}
        <article class="tool-card-enhanced">
          <span class="tool-card-icon" aria-hidden="true">{tool.icon}</span>
          <h3 class="tool-card-title">
            {tool.name}
          </h3>
          <p class="tool-card-description">
            {tool.description}
          </p>
          <div class="tool-features">
            {#each tool.badges as badge}
              <span class="feature-badge-small">{badge}</span>
            {/each}
          </div>
          <div class="tool-card-action">
            <a class="btn primary" href={tool.href}>Open tool →</a>
          </div>
        </article>
      {/each}
    </div>
  </div>
</section>

<section class="tools-section">
  <div class="container">
    <header class="tools-section-header">
      <h2 class="tools-section-title">Document Tools</h2>
      <p class="tools-section-description">
        Convert between 100+ formats with our Pandoc-powered engine.
      </p>
    </header>
    <div class="tools-grid">
      {#each documentTools as tool}
        <article class="tool-card-enhanced">
          <span class="tool-card-icon" aria-hidden="true">{tool.icon}</span>
          <h3 class="tool-card-title">
            {tool.name}
            {#if tool.tier === 'pro'}
              <span class="tool-pill tool-pill-pro">Pro</span>
            {/if}
          </h3>
          <p class="tool-card-description">
            {tool.description}
          </p>
          <div class="tool-features">
            {#each tool.badges as badge}
              <span class="feature-badge-small">{badge}</span>
            {/each}
          </div>
          <div class="tool-card-action">
            <a class="btn primary" href={tool.href}>Try converter →</a>
          </div>
        </article>
      {/each}
    </div>
  </div>
</section>

<section class="pro-upsell container" aria-label="Pro workflows">
  <div class="cta-box">
    <h3>Plan migrations with confidence</h3>
    <p>
      Run Sitemap Delta before launch to spot risky removals, cluster patterns, and export 301 configs for nginx or
      Apache.
    </p>
    <a class="btn primary" href="/tools/sitemap-delta/">Preflight a migration →</a>
  </div>
  <div class="cta-box">
    <h3>Convert docs without leaving the browser</h3>
    <p>
      Our Pandoc + Chromium engine handles 100+ formats with CSV-safe exports. Great for reports, policies, and content
      refreshes.
    </p>
    <a class="btn secondary" href="/tools/text-converter/">Try the converter →</a>
  </div>
</section>

<style>
  .hero-tools {
    padding: 32px 0 16px;
  }

  .hero-title {
    margin: 0 0 0.25rem;
    font-size: clamp(2rem, 3vw, 2.4rem);
  }

  .hero-subtitle {
    margin: 0;
    max-width: 640px;
    color: var(--text-secondary, #cfd2e0);
    font-size: 0.98rem;
  }

  .tools-section {
    padding: 8px 0 32px;
  }

  .tools-section-header {
    margin-bottom: 1rem;
  }

  .tools-section-title {
    margin: 0 0 0.25rem;
    font-size: 1.2rem;
  }

  .tools-section-description {
    margin: 0;
    color: var(--text-muted, #9ba0b9);
    font-size: 0.94rem;
  }

  .tools-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: var(--space-5, 1.25rem);
    margin-top: var(--space-4, 1rem);
  }

  .tool-card-enhanced {
    border-radius: var(--radius-2xl, 18px);
    border: 1px solid var(--border-default, #25273a);
    background: var(--surface-base, #05060a);
    padding: var(--space-5, 1.25rem);
    position: relative;
    box-shadow: 0 18px 45px rgba(15, 23, 42, 0.55);
  }

  .tool-card-icon {
    font-size: 2rem;
    display: block;
    margin-bottom: var(--space-3, 0.75rem);
  }

  .tool-card-title {
    margin: 0 0 0.35rem;
    font-size: 1.08rem;
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .tool-card-description {
    margin: 0 0 0.75rem;
    color: var(--text-secondary, #cfd2e0);
    font-size: 0.94rem;
  }

  .tool-features {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-bottom: 0.75rem;
  }

  .feature-badge-small {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    padding: 3px 9px;
    font-size: 0.78rem;
    background: var(--surface-chip, rgba(148, 163, 184, 0.12));
    color: var(--text-muted, #9ba0b9);
  }

  .tool-card-action {
    display: flex;
    justify-content: flex-start;
  }

  .tool-pill {
    border-radius: 999px;
    border: 1px solid var(--brand-border, #4f46e5);
    padding: 2px 8px;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .tool-pill-pro {
    background: var(--brand, #4f46e5);
    color: #fff;
  }

  .pro-upsell {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: var(--space-4, 1rem);
    margin: var(--space-6, 1.5rem) auto var(--space-10, 2.5rem);
  }

  .cta-box {
    background: var(--surface-elevated, #0f172a);
    border: 1px solid var(--border-default, #25273a);
    border-radius: var(--radius-2xl, 18px);
    padding: var(--space-5, 1.25rem);
    box-shadow: 0 18px 45px rgba(15, 23, 42, 0.55);
    display: flex;
    flex-direction: column;
    gap: var(--space-3, 0.75rem);
  }

  .cta-box h3 {
    margin: 0;
  }

  .cta-box p {
    margin: 0;
    color: var(--text-secondary, #cfd2e0);
  }

  .btn.secondary {
    border: 1px solid var(--border-default, #25273a);
    background: transparent;
  }

  .cta-box .btn.secondary {
    margin-top: auto;
  }

  @media (max-width: 640px) {
    .hero-tools {
      padding-top: 24px;
    }
  }
</style>
