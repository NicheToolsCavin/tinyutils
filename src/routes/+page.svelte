<script>
  import AdSlot from '$lib/components/AdSlot.svelte';

  const tools = [
    {
      icon: '🔍',
      title: 'Dead Link Finder',
      href: '/tools/dead-link-finder/',
      description:
        'Scan a page, list, or sitemap for broken links. Robots-aware with redirect chain detection and comprehensive CSV/JSON exports.',
      badges: ['Robots-aware', 'HSTS guard', 'Wayback links']
    },
    {
      icon: '🗺️',
      title: 'Sitemap Delta',
      href: '/tools/sitemap-delta/',
      description:
        'Compare two sitemaps to identify added and removed URLs. Get a confidence-scored 301 redirect plan with automatic mapping suggestions.',
      badges: ['.xml.gz support', 'Redirect mapper', '410 lists']
    },
    {
      icon: '⏪',
      title: 'Wayback Fixer',
      href: '/tools/wayback-fixer/',
      description:
        'Find Internet Archive snapshots for dead URLs. Get a complete replacement map with optional HEAD verification and SavePageNow queuing.',
      badges: ['HEAD verify', 'SavePageNow', 'Best match']
    },
    {
      icon: '📄',
      title: 'Document Converter',
      href: '/tools/text-converter/',
      description:
        'Convert between 100+ document formats including Markdown, PDF, DOCX, HTML, RTF, and ODT. High-quality PDF rendering with Chromium.',
      badges: ['Chromium PDF', 'Pandoc engine', '100+ formats']
    },
    {
      icon: '🖼️',
      title: 'Image Compressor',
      href: '/tools/image-compressor/',
      description:
        'Compress and convert images in your browser. Supports JPEG, PNG, WebP, and HEIC with adjustable quality. No upload required—100% private.',
      badges: ['Client-side', 'HEIC support', 'Batch process']
    },
    {
      icon: '🧬',
      title: 'Big CSV Joiner',
      href: '/tools/csv-joiner/',
      description:
        'Merge two CSV/TSV files on a shared column (like Email or ID). Supports inner and left joins with automatic delimiter detection.',
      badges: ['Auto delimiter', 'Inner/Left joins', 'Large files']
    },
    {
      icon: '🥨',
      title: 'Smart JSON ↔ CSV Converter',
      href: '/tools/json-to-csv/',
      description:
        'Flatten nested JSON and JSONL logs into spreadsheet-ready CSV, or convert CSV back into JSON arrays without scripts.',
      badges: ['JSONL support', 'Nested flattening', 'Up to 50MB']
    },
    {
      icon: '📑',
      title: 'Bulk PDF Text Extractor',
      href: '/tools/pdf-text-extractor/',
      description:
        'Upload a ZIP of PDFs and get back a ZIP of plain text files. Ideal for research corpora, contracts, and AI pre-processing.',
      badges: ['Batch PDFs', 'Plain text', 'Error report']
    }
  ];
</script>

<svelte:head>
  <title>TinyUtils — Useful web tools for SEOs &amp; builders</title>
  <meta
		name="description"
		content="Dead Link Finder, Sitemap Delta, Wayback Fixer, Document Converter, Image Compressor, and data tools like CSV Joiner, JSON↔CSV, and Bulk PDF extractor. Fast, polite, privacy-friendly tools for SEOs and builders."
  />
  <link rel="canonical" href="/" />
  <meta property="og:title" content="TinyUtils — Useful web tools for SEOs &amp; builders" />
  <meta
    property="og:description"
    content="Dead Link Finder, Sitemap Delta, Wayback Fixer, Document Converter, Image Compressor, and data tools like CSV Joiner, JSON↔CSV, and Bulk PDF extractor. Fast, polite, privacy-friendly tools for SEOs and builders."
  />
  <meta property="og:image" content="/og.png" />
  <meta property="og:url" content="https://tinyutils.net/" />
  <meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<section class="hero-enhanced" data-testid="home-hero">
	<h1 class="hero-title fade-in-up" data-testid="home-hero-title">Useful web tools for SEOs &amp; builders</h1>
	<p class="hero-subtitle fade-in-up delay-1" data-testid="home-hero-subtitle">Fast, polite, privacy-friendly. No sign-up required.</p>
	<div class="hero-cta fade-in-up delay-2">
		<a class="btn primary lg" href="/tools/" data-testid="home-cta-browse-tools">
      Browse all tools →
    </a>
    <a class="btn secondary lg" href="/tools/wayback-fixer/">
      Try Wayback Fixer
    </a>
  </div>
</section>

<main id="main">
  <div class="container">
    <!-- Top ad slot -->
    <AdSlot style="margin: var(--space-12) 0;" />

    <section class="tool-cards" id="tools-list" data-testid="home-tools-list">
      {#each tools as tool, i}
        <article class={"tool-card fade-in-up delay-" + (i + 1)} data-testid={`home-tool-card-${i}`}>
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

    <!-- Bottom ad slot with copy -->
    <AdSlot style="margin: var(--space-10) 0;" />

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
</main>

<style>
  .hero-enhanced {
    text-align: center;
    padding: var(--space-24) var(--space-4) var(--space-16);
    position: relative;
    overflow: hidden;
  }

  .hero-enhanced::before {
    content: '';
    position: absolute;
    top: -60%;
    left: -60%;
    width: 220%;
    height: 220%;
    background: radial-gradient(
      circle at 50% 50%,
      rgba(59, 130, 246, 0.1) 0%,
      rgba(59, 130, 246, 0.04) 35%,
      transparent 65%
    );
    animation: pulse 8s ease-in-out infinite;
    pointer-events: none;
  }

  .hero-title {
    font-size: var(--text-5xl);
    font-weight: var(--font-bold);
    line-height: var(--leading-tight);
    margin: 0 0 var(--space-6);
    background: var(--gradient-brand);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    position: relative;
  }

  .hero-subtitle {
    font-size: var(--text-xl);
    color: var(--text-secondary);
    margin: 0 0 var(--space-8);
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
  }

  .hero-cta {
    display: flex;
    gap: var(--space-4);
    justify-content: center;
    flex-wrap: wrap;
  }

  .tool-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--space-6);
    margin: var(--space-12) 0;
  }

  .tool-card {
    background: var(--surface-base);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-2xl);
    padding: var(--space-6);
    transition: all var(--transition-base);
    position: relative;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .tool-card:hover {
    transform: translateY(-4px);
    border-color: var(--hover-accent);
    box-shadow: 0 12px 40px var(--hover-shadow-color);
  }

  .tool-icon {
    font-size: var(--text-4xl);
    margin-bottom: var(--space-4);
    display: block;
  }

  .tool-title {
    font-size: var(--text-2xl);
    font-weight: var(--font-semibold);
    margin: 0 0 var(--space-3);
    color: var(--text-primary);
  }

  .tool-description {
    color: var(--text-secondary);
    line-height: var(--leading-relaxed);
    margin: 0 0 var(--space-6);
  }

  .tool-meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin-top: var(--space-4);
  }

  .feature-badge {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-1) var(--space-2);
    font-size: var(--text-xs);
    font-weight: var(--font-medium);
    border-radius: var(--radius-full);
    background: rgba(59, 130, 246, 0.1);
    color: var(--brand-500);
    border: 1px solid rgba(59, 130, 246, 0.2);
  }

  .pro-upsell {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--space-4);
    margin: var(--space-10) 0 var(--space-14);
  }

  .cta-box {
    background: var(--surface-base);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-2xl);
    padding: var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    box-shadow: var(--shadow-lg);
    transition: all var(--transition-base);
  }

  .cta-box:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-xl);
    border-color: var(--border-strong);
  }

  .cta-box h3 {
    margin: 0;
    color: var(--text-primary);
  }

  .cta-box p {
    color: var(--text-secondary);
    margin: 0;
    flex: 1;
  }

  .btn.secondary {
    border: 1px solid var(--border-default);
    background: transparent;
  }

  /* Fade-in animations */
  .fade-in-up {
    opacity: 0;
    animation: fadeInUp 0.6s ease-out forwards;
  }

  .delay-1 {
    animation-delay: 0.1s;
  }

  .delay-2 {
    animation-delay: 0.2s;
  }

  .delay-3 {
    animation-delay: 0.3s;
  }

  .delay-4 {
    animation-delay: 0.4s;
  }

  .delay-5 {
    animation-delay: 0.5s;
  }

  .delay-6 {
    animation-delay: 0.6s;
  }

  .delay-7 {
    animation-delay: 0.7s;
  }

  .delay-8 {
    animation-delay: 0.8s;
  }

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes pulse {
    0%,
    100% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.05);
      opacity: 0.8;
    }
  }
</style>
