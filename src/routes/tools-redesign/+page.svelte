<script>
  import { onMount } from 'svelte';

  let mounted = false;
  onMount(() => {
    mounted = true;
  });

  const tools = [
    {
      icon: '🔗',
      name: 'Dead Link Finder',
      category: 'Site Health',
      description: 'Crawl your entire website and identify broken links, redirects, and HTTP errors. Export results as CSV for easy fixing.',
      tags: ['SEO', 'Maintenance', 'Crawling'],
      href: '/tools/dead-link-finder/',
      color: '#06b6d4'
    },
    {
      icon: '📄',
      name: 'Document Converter',
      category: 'Content Tools',
      description: 'Convert between 100+ document formats. Markdown, PDF, DOCX, HTML, RTF, ODT, LaTeX. Powered by Pandoc.',
      tags: ['Pandoc', 'Batch', '100+ formats'],
      href: '/tools/text-converter/',
      color: '#8b5cf6'
    },
    {
      icon: '🗺️',
      name: 'Sitemap Delta',
      category: 'Site Health',
      description: 'Compare two sitemaps to find added, removed, and changed URLs. Export nginx/Apache rewrites for migrations.',
      tags: ['Migration', 'Redirects', 'SEO'],
      href: '/tools/sitemap-delta/',
      color: '#10b981'
    },
    {
      icon: '⏪',
      name: 'Wayback Fixer',
      category: 'Site Health',
      description: 'Map broken links to Internet Archive snapshots. Configurable time windows with optional verification.',
      tags: ['Archive', 'Recovery', 'Bulk'],
      href: '/tools/wayback-fixer/',
      color: '#f59e0b'
    },
    {
      icon: '🧬',
      name: 'CSV Joiner',
      category: 'Data Tools',
      description: 'Merge two CSV/TSV files on a shared column. Supports inner and left joins with automatic delimiter detection.',
      tags: ['Merge', 'Inner Join', 'Auto-detect'],
      href: '/tools/csv-joiner/',
      color: '#ef4444'
    },
    {
      icon: '🥨',
      name: 'JSON ↔ CSV',
      category: 'Data Tools',
      description: 'Flatten nested JSON into CSV or convert CSV back to JSON arrays. Handles JSONL logs up to 50MB.',
      tags: ['JSONL', 'Nested', 'Flatten'],
      href: '/tools/json-to-csv/',
      color: '#ec4899'
    }
  ];
</script>

<svelte:head>
  <title>Professional Web Tools — TinyUtils</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</svelte:head>

<main class="tools-modern" class:mounted>
  <!-- Hero Section -->
  <header class="hero">
    <div class="hero-content">
      <div class="hero-badge">
        <span class="badge-dot"></span>
        <span>Professional Grade</span>
      </div>
      <h1 class="hero-title">
        Web utilities that
        <span class="title-highlight">just work</span>
      </h1>
      <p class="hero-description">
        Production-ready tools for developers, SEO teams, and content professionals.
        <br />No installation required. No complexity added.
      </p>
    </div>
  </header>

  <!-- Tools Grid -->
  <section class="tools-section">
    <div class="section-header">
      <h2>All Tools</h2>
      <div class="tool-count">{tools.length} available</div>
    </div>

    <div class="tools-grid">
      {#each tools as tool, i}
        <article class="tool-card" style="--tool-color: {tool.color}; --delay: {i * 0.06}s">
          <div class="card-header">
            <span class="card-icon">{tool.icon}</span>
            <span class="card-category">{tool.category}</span>
          </div>

          <h3 class="card-title">{tool.name}</h3>
          <p class="card-description">{tool.description}</p>

          <div class="card-tags">
            {#each tool.tags as tag}
              <span class="tag">{tag}</span>
            {/each}
          </div>

          <a href={tool.href} class="card-cta">
            <span>Open tool</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 3L11 8L6 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </a>

          <div class="card-accent"></div>
        </article>
      {/each}
    </div>
  </section>

  <!-- Footer -->
  <footer class="footer">
    <p>Built for professionals who value quality</p>
  </footer>
</main>

<style>
  * {
    box-sizing: border-box;
  }

  .tools-modern {
    min-height: 100vh;
    background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: #0f172a;
    padding: 0;
    margin: 0;
  }

  /* ===== HERO ===== */
  .hero {
    max-width: 1200px;
    margin: 0 auto;
    padding: 8rem 2rem 6rem;
    text-align: center;
  }

  .hero-content {
    max-width: 700px;
    margin: 0 auto;
  }

  .hero-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 100px;
    font-size: 0.875rem;
    font-weight: 500;
    color: #475569;
    margin-bottom: 2rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    opacity: 0;
    animation: fadeSlide 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards;
  }

  .badge-dot {
    width: 8px;
    height: 8px;
    background: #10b981;
    border-radius: 50%;
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  .hero-title {
    font-size: clamp(2.5rem, 6vw, 4.5rem);
    font-weight: 700;
    line-height: 1.1;
    margin: 0 0 1.5rem;
    letter-spacing: -0.02em;
    opacity: 0;
    animation: fadeSlide 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards;
  }

  .title-highlight {
    background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    display: inline-block;
  }

  .hero-description {
    font-size: 1.125rem;
    line-height: 1.7;
    color: #64748b;
    margin: 0;
    opacity: 0;
    animation: fadeSlide 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards;
  }

  /* ===== TOOLS SECTION ===== */
  .tools-section {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem 2rem 6rem;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #e2e8f0;
  }

  .section-header h2 {
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0;
    color: #0f172a;
  }

  .tool-count {
    font-size: 0.875rem;
    color: #64748b;
    font-weight: 500;
  }

  .tools-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
    gap: 1.5rem;
  }

  /* ===== TOOL CARDS ===== */
  .tool-card {
    position: relative;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    padding: 2rem;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    opacity: 0;
    transform: translateY(20px);
    animation: cardEnter 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    animation-delay: var(--delay);
    box-shadow:
      0 1px 3px rgba(0, 0, 0, 0.05),
      0 1px 2px rgba(0, 0, 0, 0.03);
  }

  .tool-card:hover {
    transform: translateY(-4px);
    border-color: #cbd5e1;
    box-shadow:
      0 12px 24px rgba(0, 0, 0, 0.08),
      0 4px 8px rgba(0, 0, 0, 0.04);
  }

  .tool-card:hover .card-accent {
    opacity: 1;
  }

  .card-accent {
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    background: var(--tool-color);
    border-radius: 16px 0 0 16px;
    opacity: 0;
    transition: opacity 0.3s ease;
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
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .tool-card:hover .card-icon {
    transform: scale(1.1) rotate(-5deg);
  }

  .card-category {
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: #64748b;
    background: #f1f5f9;
    padding: 0.375rem 0.75rem;
    border-radius: 6px;
  }

  .card-title {
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0 0 0.75rem;
    color: #0f172a;
    line-height: 1.3;
  }

  .card-description {
    font-size: 0.9375rem;
    line-height: 1.6;
    color: #475569;
    margin: 0 0 1.25rem;
  }

  .card-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }

  .tag {
    font-size: 0.75rem;
    font-weight: 500;
    color: #64748b;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    padding: 0.25rem 0.625rem;
    border-radius: 6px;
    transition: all 0.2s ease;
  }

  .tool-card:hover .tag {
    background: white;
    border-color: #cbd5e1;
  }

  .card-cta {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9375rem;
    font-weight: 600;
    color: #0f172a;
    text-decoration: none;
    padding: 0.75rem 1.25rem;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .card-cta:hover {
    background: var(--tool-color);
    color: white;
    border-color: var(--tool-color);
    transform: translateX(2px);
  }

  .card-cta svg {
    transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .card-cta:hover svg {
    transform: translateX(2px);
  }

  /* ===== FOOTER ===== */
  .footer {
    max-width: 1200px;
    margin: 0 auto;
    padding: 3rem 2rem;
    text-align: center;
    font-size: 0.875rem;
    color: #94a3b8;
    border-top: 1px solid #e2e8f0;
  }

  .footer p {
    margin: 0;
  }

  /* ===== ANIMATIONS ===== */
  @keyframes fadeSlide {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes cardEnter {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* ===== RESPONSIVE ===== */
  @media (max-width: 768px) {
    .hero {
      padding: 5rem 1.5rem 4rem;
    }

    .hero-title {
      font-size: 2.5rem;
    }

    .tools-section {
      padding: 1.5rem 1.5rem 4rem;
    }

    .tools-grid {
      grid-template-columns: 1fr;
    }

    .section-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .tool-card {
      padding: 1.5rem;
    }
  }

  /* ===== ACCESSIBILITY ===== */
  @media (prefers-reduced-motion: reduce) {
    .tool-card,
    .hero-badge,
    .hero-title,
    .hero-description,
    .badge-dot {
      animation: none !important;
      opacity: 1 !important;
      transform: none !important;
    }

    .card-cta:hover,
    .tool-card:hover,
    .card-icon {
      transform: none !important;
    }
  }

  @media (prefers-color-scheme: dark) {
    .tools-modern {
      background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
      color: #f1f5f9;
    }

    .hero-badge {
      background: #1e293b;
      border-color: #334155;
      color: #cbd5e1;
    }

    .hero-title {
      color: #f8fafc;
    }

    .hero-description {
      color: #94a3b8;
    }

    .section-header {
      border-color: #334155;
    }

    .section-header h2 {
      color: #f8fafc;
    }

    .tool-count {
      color: #94a3b8;
    }

    .tool-card {
      background: #1e293b;
      border-color: #334155;
    }

    .tool-card:hover {
      border-color: #475569;
      box-shadow:
        0 12px 24px rgba(0, 0, 0, 0.3),
        0 4px 8px rgba(0, 0, 0, 0.2);
    }

    .card-category {
      background: #334155;
      color: #cbd5e1;
    }

    .card-title {
      color: #f8fafc;
    }

    .card-description {
      color: #cbd5e1;
    }

    .tag {
      background: #334155;
      border-color: #475569;
      color: #cbd5e1;
    }

    .tool-card:hover .tag {
      background: #475569;
      border-color: #64748b;
    }

    .card-cta {
      background: #334155;
      border-color: #475569;
      color: #f8fafc;
    }

    .card-cta:hover {
      background: var(--tool-color);
      color: white;
      border-color: var(--tool-color);
    }

    .footer {
      border-color: #334155;
      color: #64748b;
    }
  }
</style>
