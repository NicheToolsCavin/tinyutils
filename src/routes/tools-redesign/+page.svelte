<script>
  import { onMount } from 'svelte';

  let mounted = false;
  onMount(() => {
    mounted = true;
  });

  const tools = [
    {
      id: '01',
      icon: '🔗',
      name: 'Dead Link Finder',
      category: 'Site Health',
      description: 'Crawl your entire website and identify broken links, redirects, and HTTP errors. Export results as CSV for easy fixing.',
      tags: ['SEO', 'Maintenance', 'Crawling'],
      href: '/tools/dead-link-finder/',
      accent: '#d97706'
    },
    {
      id: '02',
      icon: '📄',
      name: 'Document Converter',
      category: 'Content Tools',
      description: 'Convert between 100+ document formats. Markdown, PDF, DOCX, HTML, RTF, ODT, LaTeX. Powered by Pandoc.',
      tags: ['Pandoc', 'Batch', '100+ formats'],
      href: '/tools/text-converter/',
      accent: '#dc2626'
    },
    {
      id: '03',
      icon: '🗺️',
      name: 'Sitemap Delta',
      category: 'Site Health',
      description: 'Compare two sitemaps to find added, removed, and changed URLs. Export nginx/Apache rewrites for migrations.',
      tags: ['Migration', 'Redirects', 'SEO'],
      href: '/tools/sitemap-delta/',
      accent: '#0891b2'
    },
    {
      id: '04',
      icon: '⏪',
      name: 'Wayback Fixer',
      category: 'Site Health',
      description: 'Map broken links to Internet Archive snapshots. Configurable time windows with optional verification.',
      tags: ['Archive', 'Recovery', 'Bulk'],
      href: '/tools/wayback-fixer/',
      accent: '#7c3aed'
    },
    {
      id: '05',
      icon: '🧬',
      name: 'CSV Joiner',
      category: 'Data Tools',
      description: 'Merge two CSV/TSV files on a shared column. Supports inner and left joins with automatic delimiter detection.',
      tags: ['Merge', 'Inner Join', 'Auto-detect'],
      href: '/tools/csv-joiner/',
      accent: '#059669'
    },
    {
      id: '06',
      icon: '🥨',
      name: 'JSON ↔ CSV',
      category: 'Data Tools',
      description: 'Flatten nested JSON into CSV or convert CSV back to JSON arrays. Handles JSONL logs up to 50MB.',
      tags: ['Flatten', 'JSONL', 'Nested'],
      href: '/tools/json-to-csv/',
      accent: '#ea580c'
    }
  ];
</script>

<svelte:head>
  <title>Professional Web Tools — TinyUtils</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=Space+Mono:wght@400;700&family=Inter:wght@400;500&display=swap" rel="stylesheet">
</svelte:head>

<main class="tools-redesign" class:mounted>
  <!-- Hero with Vintage Technical Aesthetic -->
  <header class="hero-technical">
    <div class="hero-grid">
      <div class="hero-content">
        <div class="hero-label">
          <span class="label-number">v2.0</span>
          <span class="label-divider">|</span>
          <span class="label-text">Professional-Grade</span>
        </div>
        <h1 class="hero-title">
          <span class="title-line">Web Utilities</span>
          <span class="title-line title-line-accent">Without Complexity</span>
        </h1>
        <p class="hero-description">
          Production-ready tools for developers, SEO specialists, and content teams.
          No installation. No setup. Just powerful utilities that work.
        </p>
      </div>
      <div class="hero-decoration">
        <div class="decoration-stamp">EST. 2024</div>
        <div class="decoration-grid"></div>
      </div>
    </div>
  </header>

  <!-- Tools Grid with Staggered Reveal -->
  <section class="tools-catalog">
    <div class="catalog-header">
      <h2 class="catalog-title">Complete Toolkit</h2>
      <div class="catalog-count">{tools.length} Tools</div>
    </div>

    <div class="tools-grid-redesign">
      {#each tools as tool, i}
        <article
          class="tool-card-vintage"
          style="--card-delay: {i * 0.1}s; --accent-color: {tool.accent}"
        >
          <div class="card-number">{tool.id}</div>
          <div class="card-header">
            <span class="card-icon" aria-hidden="true">{tool.icon}</span>
            <span class="card-category">{tool.category}</span>
          </div>
          <h3 class="card-title">{tool.name}</h3>
          <p class="card-description">{tool.description}</p>
          <div class="card-tags">
            {#each tool.tags as tag}
              <span class="tag">{tag}</span>
            {/each}
          </div>
          <a href={tool.href} class="card-action">
            <span>Open Tool</span>
            <span class="action-arrow">→</span>
          </a>
          <div class="card-texture"></div>
        </article>
      {/each}
    </div>
  </section>

  <!-- Atmospheric Footer -->
  <footer class="footer-technical">
    <div class="footer-grain"></div>
    <p>Built with precision. Designed for professionals.</p>
  </footer>
</main>

<style>
  /* Font Stack: Crimson Pro (editorial serif), Space Mono (technical mono), Inter (fallback) */
  .tools-redesign {
    min-height: 100vh;
    background: linear-gradient(180deg, #f5f1e8 0%, #e8ded0 100%);
    position: relative;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
  }

  /* Paper Grain Overlay */
  .tools-redesign::before {
    content: '';
    position: fixed;
    inset: 0;
    background-image:
      repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.02) 2px, rgba(0,0,0,0.02) 4px),
      repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0,0,0,0.02) 2px, rgba(0,0,0,0.02) 4px);
    opacity: 0.4;
    pointer-events: none;
    z-index: 1;
  }

  .tools-redesign > * {
    position: relative;
    z-index: 2;
  }

  /* ===== HERO SECTION ===== */
  .hero-technical {
    padding: 6rem 2rem 4rem;
    max-width: 1400px;
    margin: 0 auto;
  }

  .hero-grid {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 4rem;
    align-items: center;
  }

  .hero-label {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-family: 'Space Mono', monospace;
    font-size: 0.75rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #92400e;
    margin-bottom: 1.5rem;
    opacity: 0;
    animation: fadeSlideUp 0.8s ease-out 0.2s forwards;
  }

  .label-number {
    font-weight: 700;
    background: #d97706;
    color: white;
    padding: 0.25rem 0.5rem;
    border-radius: 2px;
  }

  .label-divider {
    color: #d97706;
  }

  .hero-title {
    font-family: 'Crimson Pro', Georgia, serif;
    font-size: clamp(3rem, 8vw, 5.5rem);
    font-weight: 700;
    line-height: 1.1;
    color: #1c0a00;
    margin: 0 0 2rem;
    letter-spacing: -0.02em;
  }

  .title-line {
    display: block;
    opacity: 0;
    animation: fadeSlideUp 0.8s ease-out forwards;
  }

  .title-line:first-child {
    animation-delay: 0.3s;
  }

  .title-line-accent {
    color: #d97706;
    font-style: italic;
    animation-delay: 0.5s;
  }

  .hero-description {
    font-size: 1.125rem;
    line-height: 1.7;
    color: #57401f;
    max-width: 600px;
    opacity: 0;
    animation: fadeSlideUp 0.8s ease-out 0.7s forwards;
  }

  /* Hero Decoration */
  .hero-decoration {
    position: relative;
    height: 300px;
    opacity: 0;
    animation: fadeIn 1s ease-out 0.9s forwards;
  }

  .decoration-stamp {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-8deg);
    font-family: 'Space Mono', monospace;
    font-size: 3rem;
    font-weight: 700;
    color: rgba(217, 119, 6, 0.15);
    border: 6px solid rgba(217, 119, 6, 0.15);
    border-radius: 50%;
    width: 220px;
    height: 220px;
    display: flex;
    align-items: center;
    justify-content: center;
    letter-spacing: 0.1em;
  }

  .decoration-grid {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(217, 119, 6, 0.1) 1px, transparent 1px),
      linear-gradient(90deg, rgba(217, 119, 6, 0.1) 1px, transparent 1px);
    background-size: 40px 40px;
  }

  /* ===== TOOLS CATALOG ===== */
  .tools-catalog {
    max-width: 1400px;
    margin: 0 auto;
    padding: 4rem 2rem 6rem;
  }

  .catalog-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 3rem;
    padding-bottom: 1rem;
    border-bottom: 3px solid #92400e;
  }

  .catalog-title {
    font-family: 'Crimson Pro', Georgia, serif;
    font-size: 2.5rem;
    font-weight: 700;
    color: #1c0a00;
    margin: 0;
  }

  .catalog-count {
    font-family: 'Space Mono', monospace;
    font-size: 0.875rem;
    letter-spacing: 0.1em;
    color: #92400e;
    text-transform: uppercase;
  }

  /* Tools Grid - Asymmetric */
  .tools-grid-redesign {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
    gap: 2rem;
  }

  /* Tool Cards - Vintage Letterpress Style */
  .tool-card-vintage {
    position: relative;
    background: linear-gradient(135deg, #fdfbf7 0%, #f5f1e8 100%);
    border: 2px solid #d4c4a8;
    border-radius: 4px;
    padding: 2rem;
    opacity: 0;
    transform: translateY(30px) scale(0.95);
    animation: stampIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    animation-delay: var(--card-delay);
    box-shadow:
      0 2px 4px rgba(0, 0, 0, 0.06),
      0 8px 16px rgba(0, 0, 0, 0.04),
      inset 0 1px 0 rgba(255, 255, 255, 0.8);
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .tool-card-vintage:hover {
    transform: translateY(-8px) rotate(-1deg);
    box-shadow:
      0 12px 24px rgba(0, 0, 0, 0.12),
      0 24px 48px rgba(0, 0, 0, 0.08),
      inset 0 1px 0 rgba(255, 255, 255, 0.8);
    border-color: var(--accent-color);
  }

  /* Card Texture Overlay */
  .card-texture {
    position: absolute;
    inset: 0;
    background-image:
      repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.01) 2px, rgba(0,0,0,0.01) 4px);
    pointer-events: none;
    border-radius: 4px;
    opacity: 0.6;
  }

  .card-number {
    position: absolute;
    top: -1rem;
    right: 1.5rem;
    font-family: 'Crimson Pro', Georgia, serif;
    font-size: 4rem;
    font-weight: 700;
    color: rgba(217, 119, 6, 0.15);
    line-height: 1;
    pointer-events: none;
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .card-icon {
    font-size: 2.5rem;
    line-height: 1;
    filter: drop-shadow(2px 2px 0 rgba(0, 0, 0, 0.1));
  }

  .card-category {
    font-family: 'Space Mono', monospace;
    font-size: 0.7rem;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: #92400e;
    background: rgba(217, 119, 6, 0.1);
    padding: 0.25rem 0.5rem;
    border-radius: 2px;
  }

  .card-title {
    font-family: 'Crimson Pro', Georgia, serif;
    font-size: 1.75rem;
    font-weight: 700;
    color: #1c0a00;
    margin: 0 0 1rem;
    line-height: 1.2;
    transition: color 0.2s ease;
  }

  .tool-card-vintage:hover .card-title {
    color: var(--accent-color);
  }

  .card-description {
    font-size: 0.95rem;
    line-height: 1.6;
    color: #57401f;
    margin: 0 0 1.5rem;
  }

  .card-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }

  .tag {
    font-family: 'Space Mono', monospace;
    font-size: 0.7rem;
    letter-spacing: 0.05em;
    color: #78350f;
    background: rgba(217, 119, 6, 0.08);
    border: 1px solid rgba(217, 119, 6, 0.2);
    padding: 0.25rem 0.6rem;
    border-radius: 2px;
  }

  .card-action {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-family: 'Space Mono', monospace;
    font-size: 0.875rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--accent-color);
    text-decoration: none;
    padding: 0.75rem 1.25rem;
    background: white;
    border: 2px solid var(--accent-color);
    border-radius: 2px;
    transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  }

  .card-action:hover {
    background: var(--accent-color);
    color: white;
    transform: translateX(4px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .action-arrow {
    transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .card-action:hover .action-arrow {
    transform: translateX(4px);
  }

  /* ===== FOOTER ===== */
  .footer-technical {
    position: relative;
    padding: 3rem 2rem;
    background: linear-gradient(180deg, transparent 0%, rgba(28, 10, 0, 0.05) 100%);
    text-align: center;
    font-family: 'Space Mono', monospace;
    font-size: 0.8rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #78350f;
  }

  .footer-grain {
    position: absolute;
    inset: 0;
    background-image:
      repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.03) 1px, rgba(0,0,0,0.03) 2px);
    opacity: 0.5;
  }

  .footer-technical p {
    position: relative;
    margin: 0;
  }

  /* ===== ANIMATIONS ===== */
  @keyframes fadeSlideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes stampIn {
    0% {
      opacity: 0;
      transform: translateY(30px) scale(0.95);
    }
    60% {
      transform: translateY(-4px) scale(1.02);
    }
    100% {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  /* ===== RESPONSIVE ===== */
  @media (max-width: 1024px) {
    .hero-grid {
      grid-template-columns: 1fr;
      gap: 2rem;
    }

    .hero-decoration {
      height: 200px;
    }

    .decoration-stamp {
      font-size: 2rem;
      width: 160px;
      height: 160px;
      border-width: 4px;
    }

    .tools-grid-redesign {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 640px) {
    .hero-technical {
      padding: 4rem 1.5rem 3rem;
    }

    .hero-title {
      font-size: 2.5rem;
    }

    .catalog-header {
      flex-direction: column;
      gap: 0.5rem;
      align-items: flex-start;
    }

    .tool-card-vintage {
      padding: 1.5rem;
    }

    .card-number {
      font-size: 3rem;
      top: -0.75rem;
      right: 1rem;
    }
  }

  /* Accessibility: Reduced Motion */
  @media (prefers-reduced-motion: reduce) {
    .tool-card-vintage,
    .title-line,
    .hero-label,
    .hero-description,
    .hero-decoration {
      animation: none !important;
      opacity: 1 !important;
      transform: none !important;
    }

    .card-action:hover,
    .tool-card-vintage:hover {
      transform: none !important;
    }
  }
</style>
