<script>
  const tools = [
    {
      icon: '🔗',
      title: 'Dead Link Finder',
      href: '/tools/dead-link-finder/',
      description:
        'Scan pages, sitemaps, or pasted URL lists for broken links. Robots-aware crawling with redirect chain detection and CSV/JSON exports built for SEO audits.',
      badges: ['Robots-aware', 'HSTS guard', 'Wayback links', 'CSV/JSON exports']
    },
    {
      icon: '🗺️',
      title: 'Sitemap Delta',
      href: '/tools/sitemap-delta/',
      description:
        'Compare two XML sitemaps to see what changed. Catch risky removals, generate a 301 redirect plan, and sanity-check large migrations before they go live.',
      badges: ['Migration-safe', '301 suggestions', 'Pattern clustering']
    },
    {
      icon: '🕰️',
      title: 'Wayback Fixer',
      href: '/tools/wayback-fixer/',
      description:
        'Find the best Wayback Machine snapshot for dead URLs. Turn 404s into recoverable pages with Save Page Now, HEAD verification, and exportable redirect maps.',
      badges: ['Wayback API', 'Best-match scoring', 'HEAD verify', 'SavePageNow']
    },
    {
      icon: '📄',
      title: 'Document Converter',
      href: '/tools/text-converter/',
      description:
        'Convert between Markdown, DOCX, HTML, PDF, and 100+ other formats using a Chromium + Pandoc engine tuned for SEOs and technical writers.',
      badges: ['Chromium PDF', 'Pandoc engine', '100+ formats', 'Pro-ready']
    }
  ];
</script>

<svelte:head>
  <title>TinyUtils — Useful web tools for SEOs &amp; builders</title>
  <meta
    name="description"
    content="Dead Link Finder, Sitemap Delta, Wayback Fixer, and a flexible document converter for many formats. Fast, polite, privacy-friendly tools for SEOs and builders."
  />
  <link rel="canonical" href="/" />
  <meta property="og:title" content="TinyUtils — Useful web tools for SEOs &amp; builders" />
  <meta
    property="og:description"
    content="Dead Link Finder, Sitemap Delta, Wayback Fixer, and a flexible document converter for many document formats."
  />
  <meta property="og:image" content="/og.png" />
  <meta property="og:url" content="https://tinyutils.net/" />
  <meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<section class="hero-enhanced">
  <h1 class="hero-title fade-in-up">Useful web tools for SEOs &amp; builders</h1>
  <p class="hero-subtitle fade-in-up delay-1">
    Fast, polite, privacy-friendly. No sign-up required.
  </p>
  <div class="hero-cta fade-in-up delay-2">
    <a class="btn primary lg" href="/tools/">
      Browse all tools →
    </a>
    <a class="btn secondary lg" href="/tools/wayback-fixer/">
      Try Wayback Fixer
    </a>
  </div>
</section>

<div class="container">
  <section class="tool-cards" id="tools-list">
    {#each tools as tool, i}
      <article class={"tool-card fade-in-up delay-" + (i + 1)}>
        <span class="tool-icon">{tool.icon}</span>
        <h2 class="tool-title">{tool.title}</h2>
        <p class="tool-description">
          {tool.description}
        </p>
        <a class="btn primary" href={tool.href}>
          Open tool →
        </a>
        <div class="tool-meta">
          {#each tool.badges as badge}
            <span class="feature-badge">{badge}</span>
          {/each}
        </div>
      </article>
    {/each}
  </section>

  <section class="ad-slot" aria-label="Sponsored" style="margin: var(--space-10) 0;">
    <ins
      class="adsbygoogle"
      style="display:block"
      data-ad-client="ca-pub-3079281180008443"
      data-ad-slot="3664281983"
      data-ad-format="auto"
      data-full-width-responsive="true"
    ></ins>
    <svelte:element this={'script'}>
      {`
        try {
          (adsbygoogle = window.adsbygoogle || []).push({});
        } catch (e) {}
      `}
    </svelte:element>
    <p style="margin-top: var(--space-4); text-align: center; color: var(--text-tertiary);">
      Ads help keep TinyUtils fast and free for everyone. Tools keep working even if you choose to
      hide ads.
    </p>
  </section>

  <section class="pro-upsell" aria-label="Pro workflows">
    <div class="cta-box">
      <h3>Ship migrations with fewer surprises</h3>
      <p>
        Use Sitemap Delta to compare old vs new maps, flag risky removals, and export redirect configs (nginx/Apache)
        before launch.
      </p>
      <a class="btn primary" href="/tools/sitemap-delta/">Plan redirects →</a>
    </div>
    <div class="cta-box">
      <h3>Fix 404s fast</h3>
      <p>
        Dead Link Finder crawls pages, sitemaps, or CSVs with HTTPS/HSTS guards and exports that drop straight into your
        spreadsheet or CMS.
      </p>
      <a class="btn secondary" href="/tools/dead-link-finder/">Run a check →</a>
    </div>
  </section>
</div>

<style>
  .hero-enhanced {
    text-align: center;
    padding: var(--space-10, 2.5rem) var(--space-4, 1rem) var(--space-8, 2rem);
    border-radius: var(--radius-2xl, 18px);
    background: var(--surface-base, #05060a);
    border: 1px solid var(--border-default, #25273a);
    box-shadow: var(--shadow-xl, 0 18px 45px rgba(15, 23, 42, 0.55));
    margin: var(--space-6) auto var(--space-8);
  }

  .hero-title {
    margin: 0;
    font-size: clamp(2rem, 3vw, 2.6rem);
    background: var(--gradient-brand);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .hero-subtitle {
    margin: 0.25rem 0 var(--space-4);
    color: var(--text-secondary, #cfd2e0);
    font-size: 1rem;
  }

  .hero-cta {
    display: flex;
    gap: var(--space-3);
    justify-content: center;
    flex-wrap: wrap;
  }

  .tool-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: var(--space-5, 1.25rem);
    margin: var(--space-6) 0 var(--space-10);
  }

  .tool-card {
    border-radius: var(--radius-2xl, 18px);
    border: 1px solid var(--border-default, #25273a);
    background: var(--surface-base, #05060a);
    padding: var(--space-5, 1.25rem);
    box-shadow: var(--shadow-lg, 0 18px 45px rgba(15, 23, 42, 0.45));
    display: grid;
    gap: var(--space-3);
  }

  .tool-icon {
    font-size: 2rem;
  }

  .tool-title {
    margin: 0;
    font-size: 1.2rem;
  }

  .tool-description {
    margin: 0;
    color: var(--text-secondary, #cfd2e0);
  }

  .tool-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  .feature-badge {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    padding: 6px 10px;
    font-size: 0.82rem;
    background: rgba(59, 130, 246, 0.15);
    color: #60a5fa;
    border: 1px solid rgba(59, 130, 246, 0.3);
  }

  .pro-upsell {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--space-4);
    margin: var(--space-10) 0 var(--space-14);
  }

  .cta-box {
    background: var(--surface-elevated, #0f172a);
    border: 1px solid var(--border-default, #25273a);
    border-radius: var(--radius-2xl);
    padding: var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    box-shadow: var(--shadow-lg, 0 18px 45px rgba(15, 23, 42, 0.45));
  }

  .cta-box h3 {
    margin: 0;
  }

  .cta-box p {
    color: var(--text-secondary);
    margin: 0;
  }

  .btn.secondary {
    border: 1px solid var(--border-default);
    background: transparent;
  }
</style>
