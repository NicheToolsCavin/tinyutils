<script>
  import { fade, slide } from 'svelte/transition';

  let showAllTools = false;

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
      name: 'Sitemap Delta + Redirect Mapper',
      href: '/tools/sitemap-delta/',
      tier: 'free',
      description:
        'Compare two sitemaps to identify added, removed, and changed URLs. Get a confidence-scored 301 redirect plan with nginx/Apache rewrite rules and 410 Gone lists for migrations.',
      badges: ['Smart mapping', 'Confidence scores', 'Rewrite exports', '410 CSV']
    },
    {
      icon: '🕰️',
      name: 'Wayback Fixer',
      href: '/tools/wayback-fixer/',
      tier: 'free',
      description:
        'Bulk-map broken URLs to Internet Archive snapshots. Configurable time windows, optional HEAD verification, and Save Page Now integration.',
      badges: ['Bulk mapping', 'Time windows', 'HEAD verify', 'SPN queue']
    }
  ];

  const documentTools = [
    {
      icon: '📄',
      name: 'Document Converter',
      href: '/tools/text-converter/',
      tier: 'pro',
      description:
        'Convert between 100+ document formats powered by Pandoc. Supports Markdown, PDF, DOCX, HTML, RTF, ODT, LaTeX, and more. Track changes, extract media.',
      badges: ['100+ formats', 'Track changes', 'Media extract', 'Batch convert']
    }
  ];

  const additionalTools = [
    {
      icon: '🔍',
      name: 'Multi-file Search & Replace',
      href: '/tools/multi-file-search-replace/',
      tier: 'beta',
      description:
        'Bulk find and replace text or regex patterns across many documents with safe diff previews and selective download.',
      badges: ['Regex support', 'Diff preview', 'ZIP download']
    },
    {
      icon: '🩺',
      name: 'Encoding Doctor',
      href: '/tools/encoding-doctor/',
      tier: 'beta',
      description:
        'Fix mojibake and encoding errors like "FranÃ§ais" → "Français". Repair broken accents, smart quotes, and Unicode normalization issues.',
      badges: ['UTF-8 repair', 'Smart quotes', 'Normalize']
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

<section class="tools-hero">
  <h1 class="tools-hero-title">Professional-Grade Web Tools</h1>
  <p class="tools-hero-subtitle">
    Advanced features without the complexity. No installation, no setup—just powerful utilities that work.
  </p>
</section>

<div class="container">
  <div class="tools-two-column">
    <!-- SEO Column -->
    <div class="tools-column">
      <header class="tools-section-header">
        <h2 class="tools-section-title">SEO & Site Management</h2>
        <p class="tools-section-description">
          Find broken links, compare sitemaps, and map URLs to archive snapshots.
        </p>
      </header>
      <div class="tools-grid-single">
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

    <!-- Document Column -->
    <div class="tools-column">
      <header class="tools-section-header">
        <h2 class="tools-section-title">Document Tools</h2>
        <p class="tools-section-description">
          Convert between 100+ formats with our Pandoc-powered engine.
        </p>
      </header>
      <div class="tools-grid-single">
        {#each documentTools as tool}
          <article class="tool-card-enhanced">
            <span class="tool-card-icon" aria-hidden="true">{tool.icon}</span>
            <h3 class="tool-card-title">
              {tool.name}
              {#if tool.tier === 'pro'}
                <span class="tool-pill tool-pill-pro">PRO</span>
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
  </div>
</div>

<!-- See More Button -->
{#if !showAllTools}
  <div class="see-more-container">
    <button class="see-more-btn" on:click={() => showAllTools = true}>
      See more tools ↓
    </button>
  </div>
{/if}

<!-- Additional Tools (Expandable) -->
{#if showAllTools}
  <div class="container" transition:slide={{ duration: 300 }}>
    <div class="additional-tools-grid">
      {#each additionalTools as tool}
        <article class="tool-card-enhanced" transition:fade={{ duration: 200 }}>
          <span class="tool-card-icon" aria-hidden="true">{tool.icon}</span>
          <h3 class="tool-card-title">
            {tool.name}
            {#if tool.tier === 'beta'}
              <span class="tool-pill tool-pill-beta">BETA</span>
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
            <a class="btn primary" href={tool.href}>Open tool →</a>
          </div>
        </article>
      {/each}
    </div>
  </div>
{/if}

<!-- Ad Slot -->
<div class="container">
  <div class="ad-slot-horizontal" aria-label="Advertisement">
    <!-- Placeholder for ad -->
  </div>
</div>

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
  /* Hero Section */
  .tools-hero {
    text-align: center;
    padding: var(--space-12) var(--space-4) var(--space-8);
    position: relative;
    overflow: hidden;
  }

  .tools-hero::before {
    content: '';
    position: absolute;
    top: -30%;
    left: -30%;
    width: 160%;
    height: 160%;
    background: radial-gradient(
      circle at 50% 50%,
      rgba(59, 130, 246, 0.08) 0%,
      transparent 50%
    );
    animation: pulse 10s ease-in-out infinite;
    pointer-events: none;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.5; transform: scale(1); }
    50% { opacity: 0.8; transform: scale(1.05); }
  }

  .tools-hero-title {
    position: relative;
    font-size: var(--text-4xl);
    font-weight: var(--font-bold);
    background: var(--gradient-brand);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: var(--space-3);
  }

  .tools-hero-subtitle {
    position: relative;
    font-size: var(--text-lg);
    color: var(--text-secondary);
    max-width: 600px;
    margin: 0 auto;
    line-height: 1.6;
  }

  /* Two Column Layout */
  .tools-two-column {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-8);
    margin: var(--space-8) 0;
  }

  .tools-column {
    display: flex;
    flex-direction: column;
  }

  .tools-section-header {
    text-align: center;
    margin-bottom: var(--space-6);
  }

  .tools-section-title {
    font-size: var(--text-xl);
    font-weight: var(--font-semibold);
    color: var(--text-primary);
    margin-bottom: var(--space-2);
    position: relative;
    display: inline-block;
  }

  .tools-section-title::after {
    content: '';
    position: absolute;
    bottom: -6px;
    left: 50%;
    transform: translateX(-50%);
    width: 60px;
    height: 3px;
    background: var(--gradient-brand);
    border-radius: 2px;
  }

  .tools-section-description {
    margin: 0;
    color: var(--text-secondary);
    font-size: var(--text-base);
  }

  .tools-grid-single {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  /* Tool Cards */
  .tool-card-enhanced {
    border-radius: var(--radius-xl);
    border: 1px solid var(--border-default);
    background: var(--surface-base);
    padding: var(--space-5);
    box-shadow: var(--shadow-lg);
    transition: all var(--transition-base);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .tool-card-enhanced:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-xl);
    border-color: var(--border-strong);
  }

  .tool-card-icon {
    font-size: 2rem;
    display: block;
  }

  .tool-card-title {
    margin: 0;
    font-size: var(--text-lg);
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .tool-card-description {
    margin: 0;
    color: var(--text-secondary);
    font-size: var(--text-sm);
    line-height: 1.6;
  }

  .tool-features {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .feature-badge-small {
    display: inline-flex;
    align-items: center;
    border-radius: var(--radius-full);
    padding: 3px 10px;
    font-size: var(--text-xs);
    background: rgba(59, 130, 246, 0.15);
    color: #60a5fa;
    border: 1px solid rgba(59, 130, 246, 0.3);
  }

  .tool-card-action {
    display: flex;
    margin-top: auto;
  }

  .tool-pill {
    border-radius: var(--radius-full);
    padding: 2px 8px;
    font-size: 0.7rem;
    font-weight: var(--font-semibold);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .tool-pill-pro {
    background: var(--brand-500);
    color: white;
    border: 1px solid var(--brand-600);
  }

  .tool-pill-beta {
    background: rgba(245, 158, 11, 0.15);
    color: #f59e0b;
    border: 1px solid rgba(245, 158, 11, 0.3);
  }

  /* See More Button */
  .see-more-container {
    text-align: center;
    margin: var(--space-6) 0;
  }

  .see-more-btn {
    background: transparent;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-full);
    padding: var(--space-3) var(--space-6);
    color: var(--text-primary);
    font-size: var(--text-base);
    cursor: pointer;
    transition: all var(--transition-base);
  }

  .see-more-btn:hover {
    background: var(--surface-raised);
    border-color: var(--border-strong);
    transform: translateY(-1px);
  }

  /* Additional Tools Grid */
  .additional-tools-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--space-4);
    margin: var(--space-6) 0;
  }

  /* Ad Slot */
  .ad-slot-horizontal {
    min-height: 120px;
    background: var(--surface-raised);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-lg);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: var(--space-8) 0;
    color: var(--text-tertiary);
    font-size: var(--text-sm);
  }

  /* CTA Boxes */
  .pro-upsell {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--space-4);
    margin: var(--space-10) auto;
  }

  .cta-box {
    background: #0f172a;
    border: 1px solid #1e293b;
    border-radius: var(--radius-2xl);
    padding: var(--space-6);
    box-shadow: var(--shadow-lg);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .cta-box h3 {
    margin: 0;
    color: #f1f5f9;
  }

  .cta-box p {
    margin: 0;
    color: #cbd5e1;
  }

  .btn.secondary {
    border: 1px solid var(--border-default);
    background: transparent;
  }

  .cta-box .btn.secondary {
    margin-top: auto;
  }

  /* Responsive */
  @media (max-width: 900px) {
    .tools-two-column {
      grid-template-columns: 1fr;
      gap: var(--space-6);
    }

    .tools-hero {
      padding: var(--space-8) var(--space-4) var(--space-6);
    }

    .tools-hero-title {
      font-size: var(--text-3xl);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .tools-hero::before {
      animation: none;
    }

    .tool-card-enhanced:hover {
      transform: none;
    }
  }
</style>
