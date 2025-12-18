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
  /* ═══════════════════════════════════════════════════════════
     LIQUID GLASS HOMEPAGE STYLES
     ═══════════════════════════════════════════════════════════ */

  /* Hero Section - Floating glass panel */
  .hero-enhanced {
    text-align: center;
    padding: var(--space-20) var(--space-4) var(--space-16);
    position: relative;
    overflow: visible;
  }

  .hero-title {
    font-family: var(--font-display);
    font-size: clamp(2.75rem, 7vw, 5rem);
    font-weight: 800;
    line-height: 1.1;
    margin: 0 0 var(--space-6);
    background: var(--accent-gradient);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    position: relative;
    letter-spacing: -0.03em;
  }

  .hero-subtitle {
    font-size: var(--text-xl);
    color: var(--text-secondary);
    margin: 0 auto var(--space-10);
    max-width: 540px;
    line-height: 1.6;
  }

  .hero-cta {
    display: flex;
    gap: 16px;
    justify-content: center;
    flex-wrap: wrap;
  }

  /* Base button - matches reference exactly */
  .hero-cta .btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 16px 32px;
    border-radius: 16px;
    font-size: 1rem;
    font-weight: 600;
    text-decoration: none;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
    border: none;
  }

  /* Primary button - exact reference match */
  .hero-cta .btn.primary {
    background: var(--accent-gradient);
    color: white;
    box-shadow: 0 8px 32px var(--accent-glow), 0 0 0 1px rgba(255, 255, 255, 0.1) inset;
  }

  .hero-cta .btn.primary:hover {
    transform: translateY(-3px);
    box-shadow: 0 16px 48px var(--accent-glow), 0 0 0 1px rgba(255, 255, 255, 0.2) inset;
  }

  /* Glass button - exact reference match */
  .hero-cta .btn.secondary {
    background: var(--glass-bg);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid var(--glass-border);
    color: var(--text-primary);
  }

  .hero-cta .btn.secondary:hover {
    background: var(--glass-bg-hover);
    border-color: var(--glass-border-hover);
    transform: translateY(-3px);
  }

  /* Tool Cards Grid */
  .tool-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: var(--space-6);
    margin: var(--space-12) 0;
  }

  /* Glass Tool Card - Liquid Glass Effect */
  .tool-card {
    position: relative;
    background: var(--glass-bg);
    backdrop-filter: blur(var(--glass-blur));
    -webkit-backdrop-filter: blur(var(--glass-blur));
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-2xl);
    padding: var(--space-8);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  }

  /* Light mode: Full liquid glass effect */
  :global(html[data-theme="light"]) .tool-card {
    background:
      linear-gradient(135deg, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.3) 100%),
      rgba(255, 255, 255, 0.45);
    border: 1px solid rgba(255, 255, 255, 0.7);
    box-shadow:
      0 8px 32px rgba(31, 38, 135, 0.08),
      0 1px 0 rgba(255, 255, 255, 0.9) inset,
      0 -1px 0 rgba(0, 0, 0, 0.05) inset;
  }

  /* Glass shine overlay - top highlight */
  .tool-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: var(--card-highlight);
  }

  /* Glass shine - curved surface reflection */
  .tool-card::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 50%;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0) 100%);
    border-radius: 24px 24px 100px 100px;
    pointer-events: none;
    opacity: 0;
  }

  :global(html[data-theme="light"]) .tool-card::after {
    opacity: 1;
  }

  .tool-card:hover {
    transform: translateY(-8px);
    border-color: var(--glass-border-hover);
    box-shadow: 0 24px 64px var(--glass-shadow);
  }

  :global(html[data-theme="light"]) .tool-card:hover {
    transform: translateY(-8px);
    background:
      linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.5) 100%),
      rgba(255, 255, 255, 0.65);
    border-color: rgba(255, 255, 255, 0.9);
    box-shadow:
      0 24px 64px rgba(31, 38, 135, 0.12),
      0 1px 0 rgba(255, 255, 255, 1) inset,
      0 -1px 0 rgba(0, 0, 0, 0.05) inset;
  }

  .tool-icon {
    font-size: 3rem;
    margin-bottom: var(--space-4);
    display: block;
    position: relative;
    z-index: 1;
  }

  .tool-title {
    font-size: var(--text-2xl);
    font-weight: var(--font-semibold);
    margin: 0 0 var(--space-2);
    color: var(--text-primary);
    position: relative;
    z-index: 1;
  }

  .tool-description {
    color: var(--text-secondary);
    line-height: 1.7;
    margin: 0 0 var(--space-6);
    flex: 1;
    position: relative;
    z-index: 1;
  }

  /* Tool card buttons - matches reference */
  .tool-card .btn {
    position: relative;
    z-index: 1;
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 14px 28px;
    border-radius: 14px;
    font-size: 0.95rem;
    font-weight: 600;
    text-decoration: none;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
    border: none;
  }

  .tool-card .btn.primary {
    background: var(--accent-gradient);
    color: white;
    box-shadow: 0 6px 24px var(--accent-glow), 0 0 0 1px rgba(255, 255, 255, 0.1) inset;
  }

  .tool-card .btn.primary:hover {
    transform: translateY(-3px);
    box-shadow: 0 12px 36px var(--accent-glow), 0 0 0 1px rgba(255, 255, 255, 0.2) inset;
  }

  .tool-meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin-top: var(--space-4);
    position: relative;
    z-index: 1;
  }

  /* Glass badges */
  .feature-badge {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-1) var(--space-3);
    font-size: var(--text-xs);
    font-weight: var(--font-medium);
    border-radius: var(--radius-full);
    background: var(--glass-bg);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    color: var(--accent-primary);
    border: 1px solid var(--glass-border);
    transition: all 0.2s ease;
  }

  .feature-badge:hover {
    background: var(--glass-bg-hover);
    border-color: var(--accent-primary);
  }

  /* Pro Upsell CTA Section */
  .pro-upsell {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: var(--space-6);
    margin: var(--space-16) 0;
  }

  .cta-box {
    position: relative;
    background: var(--glass-bg);
    backdrop-filter: blur(var(--glass-blur));
    -webkit-backdrop-filter: blur(var(--glass-blur));
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-2xl);
    padding: var(--space-8);
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  }

  /* Light mode: Liquid glass CTA */
  :global(html[data-theme="light"]) .cta-box {
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.75) 0%, rgba(255, 255, 255, 0.5) 100%);
    border: 1px solid rgba(255, 255, 255, 0.8);
    box-shadow:
      0 12px 48px rgba(31, 38, 135, 0.1),
      0 1px 0 rgba(255, 255, 255, 0.95) inset,
      0 -1px 0 rgba(0, 0, 0, 0.03) inset;
  }

  .cta-box::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.5), transparent);
    opacity: 0.8;
  }

  .cta-box::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 40%;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0) 100%);
    border-radius: 24px 24px 100px 100px;
    pointer-events: none;
    opacity: 0;
  }

  :global(html[data-theme="light"]) .cta-box::after {
    opacity: 1;
  }

  .cta-box:hover {
    transform: translateY(-8px);
    border-color: var(--glass-border-hover);
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.15);
  }

  :global(html[data-theme="light"]) .cta-box:hover {
    transform: translateY(-8px);
    box-shadow:
      0 24px 64px rgba(31, 38, 135, 0.12),
      0 1px 0 rgba(255, 255, 255, 1) inset,
      0 -1px 0 rgba(0, 0, 0, 0.05) inset;
  }

  .cta-box h3 {
    margin: 0;
    color: var(--text-primary);
    font-size: var(--text-xl);
    font-weight: var(--font-semibold);
    position: relative;
    z-index: 1;
  }

  .cta-box p {
    color: var(--text-secondary);
    margin: 0;
    flex: 1;
    line-height: 1.7;
    position: relative;
    z-index: 1;
  }

  /* CTA box buttons - matches reference */
  .cta-box .btn {
    position: relative;
    z-index: 1;
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 14px 28px;
    border-radius: 14px;
    font-size: 0.95rem;
    font-weight: 600;
    text-decoration: none;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
  }

  .cta-box .btn.primary {
    background: var(--accent-gradient);
    color: white;
    border: none;
    box-shadow: 0 6px 24px var(--accent-glow), 0 0 0 1px rgba(255, 255, 255, 0.1) inset;
  }

  .cta-box .btn.primary:hover {
    transform: translateY(-3px);
    box-shadow: 0 12px 36px var(--accent-glow), 0 0 0 1px rgba(255, 255, 255, 0.2) inset;
  }

  .cta-box .btn.secondary {
    background: var(--glass-bg);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid var(--glass-border);
    color: var(--text-primary);
  }

  .cta-box .btn.secondary:hover {
    background: var(--glass-bg-hover);
    border-color: var(--glass-border-hover);
    transform: translateY(-3px);
  }

  /* Fade-in animations */
  .fade-in-up {
    opacity: 0;
    animation: fadeInUp 0.6s ease-out forwards;
  }

  .delay-1 { animation-delay: 0.1s; }
  .delay-2 { animation-delay: 0.2s; }
  .delay-3 { animation-delay: 0.3s; }
  .delay-4 { animation-delay: 0.4s; }
  .delay-5 { animation-delay: 0.5s; }
  .delay-6 { animation-delay: 0.6s; }
  .delay-7 { animation-delay: 0.7s; }
  .delay-8 { animation-delay: 0.8s; }

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(24px);
    }
    to {
      opacity: 1;
      /* No transform here - allows hover transforms to work */
    }
  }

  /* Light mode: Feature badges with glass effect */
  :global(html[data-theme="light"]) .feature-badge {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.5) 100%);
    border: 1px solid rgba(255, 255, 255, 0.8);
    box-shadow:
      0 2px 8px rgba(31, 38, 135, 0.06),
      0 1px 0 rgba(255, 255, 255, 0.9) inset;
    color: #3b82f6;
  }

  /* Light mode: Hero primary button - exact reference match */
  :global(html[data-theme="light"]) .hero-cta .btn.primary {
    box-shadow:
      0 8px 32px var(--accent-glow),
      0 1px 0 rgba(255, 255, 255, 0.3) inset;
  }

  :global(html[data-theme="light"]) .hero-cta .btn.primary:hover {
    box-shadow:
      0 16px 48px var(--accent-glow),
      0 1px 0 rgba(255, 255, 255, 0.4) inset;
  }

  /* Light mode: Hero glass button - exact reference match */
  :global(html[data-theme="light"]) .hero-cta .btn.secondary {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.4) 100%);
    border: 1px solid rgba(255, 255, 255, 0.8);
    box-shadow:
      0 4px 16px rgba(31, 38, 135, 0.08),
      0 1px 0 rgba(255, 255, 255, 0.9) inset;
  }

  :global(html[data-theme="light"]) .hero-cta .btn.secondary:hover {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.6) 100%);
    box-shadow:
      0 8px 24px rgba(31, 38, 135, 0.12),
      0 1px 0 rgba(255, 255, 255, 1) inset;
  }

  /* Light mode: Card/CTA primary buttons */
  :global(html[data-theme="light"]) .tool-card .btn.primary,
  :global(html[data-theme="light"]) .cta-box .btn.primary {
    box-shadow:
      0 6px 24px var(--accent-glow),
      0 1px 0 rgba(255, 255, 255, 0.3) inset;
  }

  :global(html[data-theme="light"]) .tool-card .btn.primary:hover,
  :global(html[data-theme="light"]) .cta-box .btn.primary:hover {
    box-shadow:
      0 12px 36px var(--accent-glow),
      0 1px 0 rgba(255, 255, 255, 0.4) inset;
  }

  /* Light mode: Glass secondary button */
  :global(html[data-theme="light"]) .cta-box .btn.secondary {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.4) 100%);
    border: 1px solid rgba(255, 255, 255, 0.8);
    box-shadow:
      0 4px 16px rgba(31, 38, 135, 0.08),
      0 1px 0 rgba(255, 255, 255, 0.9) inset;
  }

  :global(html[data-theme="light"]) .cta-box .btn.secondary:hover {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.6) 100%);
    box-shadow:
      0 8px 24px rgba(31, 38, 135, 0.12),
      0 1px 0 rgba(255, 255, 255, 1) inset;
  }

  /* Accessibility: Respect reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .fade-in-up,
    .hero-enhanced::before {
      animation: none !important;
      transition: none !important;
    }
    .fade-in-up {
      opacity: 1 !important;
    }
    .delay-1, .delay-2, .delay-3, .delay-4, .delay-5, .delay-6, .delay-7, .delay-8 {
      animation-delay: 0s !important;
    }
  }

  /* Responsive */
  @media (max-width: 768px) {
    .hero-enhanced {
      padding: var(--space-12) var(--space-4) var(--space-10);
    }

    .tool-cards {
      grid-template-columns: 1fr;
    }

    .tool-card {
      padding: var(--space-6);
    }

    .pro-upsell {
      grid-template-columns: 1fr;
    }
  }
</style>
