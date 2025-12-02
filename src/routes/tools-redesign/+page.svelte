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
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      glow: 'rgba(245, 158, 11, 0.4)'
    },
    {
      id: '02',
      icon: '📄',
      name: 'Document Converter',
      category: 'Content Tools',
      description: 'Convert between 100+ document formats. Markdown, PDF, DOCX, HTML, RTF, ODT, LaTeX. Powered by Pandoc.',
      tags: ['Pandoc', 'Batch', '100+ formats'],
      href: '/tools/text-converter/',
      gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      glow: 'rgba(239, 68, 68, 0.4)'
    },
    {
      id: '03',
      icon: '🗺️',
      name: 'Sitemap Delta',
      category: 'Site Health',
      description: 'Compare two sitemaps to find added, removed, and changed URLs. Export nginx/Apache rewrites for migrations.',
      tags: ['Migration', 'Redirects', 'SEO'],
      href: '/tools/sitemap-delta/',
      gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
      glow: 'rgba(6, 182, 212, 0.4)'
    },
    {
      id: '04',
      icon: '⏪',
      name: 'Wayback Fixer',
      category: 'Site Health',
      description: 'Map broken links to Internet Archive snapshots. Configurable time windows with optional verification.',
      tags: ['Archive', 'Recovery', 'Bulk'],
      href: '/tools/wayback-fixer/',
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
      glow: 'rgba(139, 92, 246, 0.4)'
    },
    {
      id: '05',
      icon: '🧬',
      name: 'CSV Joiner',
      category: 'Data Tools',
      description: 'Merge two CSV/TSV files on a shared column. Supports inner and left joins with automatic delimiter detection.',
      tags: ['Merge', 'Inner Join', 'Auto-detect'],
      href: '/tools/csv-joiner/',
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      glow: 'rgba(16, 185, 129, 0.4)'
    },
    {
      id: '06',
      icon: '🥨',
      name: 'JSON ↔ CSV',
      category: 'Data Tools',
      description: 'Flatten nested JSON into CSV or convert CSV back to JSON arrays. Handles JSONL logs up to 50MB.',
      tags: ['Flatten', 'JSONL', 'Nested'],
      href: '/tools/json-to-csv/',
      gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
      glow: 'rgba(249, 115, 22, 0.4)'
    }
  ];
</script>

<svelte:head>
  <title>Professional Web Tools — TinyUtils</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700;900&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
</svelte:head>

<main class="tools-redesign" class:mounted>
  <!-- Hero with Retro-Future Aesthetic -->
  <header class="hero-retro">
    <div class="hero-ambient"></div>
    <div class="hero-content">
      <h1 class="hero-title">
        <span class="title-main">Professional</span>
        <span class="title-accent">Web Tools</span>
      </h1>
      <p class="hero-subtitle">
        Production-grade utilities for developers and content teams.
        <br>No installation. No complexity. Just power.
      </p>
    </div>
    <div class="hero-glow"></div>
  </header>

  <!-- Tools Grid with Retro-Future Cards -->
  <section class="tools-catalog">
    <div class="catalog-header">
      <h2 class="catalog-title">Complete Toolkit</h2>
      <div class="catalog-meta">
        <span class="meta-count">{tools.length}</span>
        <span class="meta-label">Tools</span>
      </div>
    </div>

    <div class="tools-grid-retro">
      {#each tools as tool, i}
        <article
          class="tool-card-retro"
          style="--card-delay: {i * 0.08}s; --card-gradient: {tool.gradient}; --card-glow: {tool.glow}"
        >
          <div class="card-glow-border"></div>
          <div class="card-inner">
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
              <span class="action-text">Open Tool</span>
              <span class="action-icon">→</span>
            </a>
          </div>
          <div class="card-hologram"></div>
        </article>
      {/each}
    </div>
  </section>

  <!-- Atmospheric Footer -->
  <footer class="footer-retro">
    <div class="footer-glow"></div>
    <p>Crafted with precision for the modern web</p>
  </footer>
</main>

<style>
  /* Font Stack: Playfair Display (elegant serif), Inter (modern sans) */
  .tools-redesign {
    min-height: 100vh;
    background:
      radial-gradient(circle at 20% 30%, rgba(245, 158, 11, 0.06) 0%, transparent 50%),
      radial-gradient(circle at 80% 70%, rgba(139, 92, 246, 0.06) 0%, transparent 50%),
      linear-gradient(180deg, #f5f1e8 0%, #e8ded0 100%);
    position: relative;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    overflow-x: hidden;
  }

  /* Subtle Paper Grain */
  .tools-redesign::before {
    content: '';
    position: fixed;
    inset: 0;
    background-image:
      repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.015) 3px, rgba(0,0,0,0.015) 6px);
    opacity: 0.3;
    pointer-events: none;
    z-index: 1;
  }

  .tools-redesign > * {
    position: relative;
    z-index: 2;
  }

  /* ===== HERO SECTION ===== */
  .hero-retro {
    position: relative;
    padding: 8rem 2rem 5rem;
    max-width: 1200px;
    margin: 0 auto;
    text-align: center;
    overflow: hidden;
  }

  .hero-ambient {
    position: absolute;
    top: -50%;
    left: 50%;
    transform: translateX(-50%);
    width: 150%;
    height: 200%;
    background: radial-gradient(
      circle at 50% 30%,
      rgba(245, 158, 11, 0.12) 0%,
      rgba(139, 92, 246, 0.08) 40%,
      transparent 70%
    );
    animation: ambientPulse 12s ease-in-out infinite;
    pointer-events: none;
  }

  .hero-content {
    position: relative;
    z-index: 2;
  }

  .hero-title {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: clamp(3rem, 10vw, 6.5rem);
    font-weight: 900;
    line-height: 1;
    margin: 0 0 2rem;
    letter-spacing: -0.03em;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .title-main {
    color: #2d1f0f;
    opacity: 0;
    transform: translateY(30px);
    animation: fadeSlideUp 1s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards;
  }

  .title-accent {
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #ea580c 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    font-style: italic;
    opacity: 0;
    transform: translateY(30px);
    animation: fadeSlideUp 1s cubic-bezier(0.16, 1, 0.3, 1) 0.4s forwards;
    filter: drop-shadow(0 0 20px rgba(245, 158, 11, 0.3));
  }

  .hero-subtitle {
    font-size: 1.125rem;
    line-height: 1.8;
    color: #57401f;
    max-width: 600px;
    margin: 0 auto;
    opacity: 0;
    animation: fadeIn 1s ease-out 0.6s forwards;
  }

  .hero-glow {
    position: absolute;
    bottom: -100px;
    left: 50%;
    transform: translateX(-50%);
    width: 600px;
    height: 200px;
    background: radial-gradient(ellipse at center, rgba(245, 158, 11, 0.15) 0%, transparent 70%);
    filter: blur(60px);
    pointer-events: none;
    animation: glowPulse 4s ease-in-out infinite;
  }

  /* ===== TOOLS CATALOG ===== */
  .tools-catalog {
    max-width: 1300px;
    margin: 0 auto;
    padding: 3rem 2rem 6rem;
  }

  .catalog-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 3rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid rgba(146, 64, 14, 0.15);
    position: relative;
  }

  .catalog-header::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    width: 120px;
    height: 2px;
    background: linear-gradient(90deg, #f59e0b 0%, transparent 100%);
  }

  .catalog-title {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 2.5rem;
    font-weight: 700;
    color: #1c0a00;
    margin: 0;
  }

  .catalog-meta {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    font-family: 'Inter', sans-serif;
  }

  .meta-count {
    font-size: 2rem;
    font-weight: 600;
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .meta-label {
    font-size: 0.875rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #92400e;
  }

  /* Tools Grid - Organic Flow */
  .tools-grid-retro {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
    gap: 2rem;
  }

  /* Tool Cards - Retro-Future Glow */
  .tool-card-retro {
    position: relative;
    background: linear-gradient(135deg, #fdfbf7 0%, #f5f1e8 100%);
    border-radius: 20px;
    padding: 0;
    opacity: 0;
    transform: translateY(40px) scale(0.96);
    animation: floatIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    animation-delay: var(--card-delay);
    overflow: hidden;
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .tool-card-retro:hover {
    transform: translateY(-12px) scale(1.02);
  }

  /* Glowing Border Effect */
  .card-glow-border {
    position: absolute;
    inset: -2px;
    border-radius: 20px;
    padding: 2px;
    background: var(--card-gradient);
    -webkit-mask:
      linear-gradient(#fff 0 0) content-box,
      linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    opacity: 0;
    transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    filter: blur(0.5px);
  }

  .tool-card-retro:hover .card-glow-border {
    opacity: 1;
    animation: borderGlow 2s ease-in-out infinite;
  }

  .card-inner {
    position: relative;
    padding: 2.5rem;
    background: linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(253,251,247,0.95) 100%);
    border-radius: 18px;
    backdrop-filter: blur(10px);
    z-index: 2;
  }

  /* Holographic Overlay */
  .card-hologram {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      135deg,
      transparent 0%,
      rgba(245, 158, 11, 0.03) 30%,
      rgba(139, 92, 246, 0.03) 70%,
      transparent 100%
    );
    opacity: 0;
    transition: opacity 0.4s ease;
    pointer-events: none;
    border-radius: 20px;
  }

  .tool-card-retro:hover .card-hologram {
    opacity: 1;
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.25rem;
  }

  .card-icon {
    font-size: 3rem;
    line-height: 1;
    filter: drop-shadow(2px 4px 8px rgba(0, 0, 0, 0.1));
    transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .tool-card-retro:hover .card-icon {
    transform: scale(1.15) rotate(-5deg);
  }

  .card-category {
    font-size: 0.75rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #92400e;
    background: rgba(245, 158, 11, 0.1);
    padding: 0.35rem 0.75rem;
    border-radius: 12px;
    font-weight: 500;
  }

  .card-title {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 1.875rem;
    font-weight: 700;
    color: #1c0a00;
    margin: 0 0 1rem;
    line-height: 1.2;
    transition: all 0.3s ease;
  }

  .tool-card-retro:hover .card-title {
    background: var(--card-gradient);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .card-description {
    font-size: 0.95rem;
    line-height: 1.7;
    color: #57401f;
    margin: 0 0 1.5rem;
  }

  .card-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 1.75rem;
  }

  .tag {
    font-size: 0.75rem;
    letter-spacing: 0.03em;
    color: #78350f;
    background: rgba(217, 119, 6, 0.08);
    border: 1px solid rgba(217, 119, 6, 0.15);
    padding: 0.35rem 0.75rem;
    border-radius: 8px;
    font-weight: 500;
    transition: all 0.2s ease;
  }

  .tool-card-retro:hover .tag {
    background: rgba(245, 158, 11, 0.12);
    border-color: rgba(245, 158, 11, 0.25);
  }

  .card-action {
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.95rem;
    font-weight: 600;
    color: white;
    text-decoration: none;
    padding: 0.875rem 1.75rem;
    background: var(--card-gradient);
    border-radius: 12px;
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    box-shadow:
      0 4px 12px rgba(0, 0, 0, 0.08),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
    position: relative;
    overflow: hidden;
  }

  .card-action::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 100%);
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .card-action:hover {
    transform: translateX(4px);
    box-shadow:
      0 8px 20px var(--card-glow),
      inset 0 1px 0 rgba(255, 255, 255, 0.3);
  }

  .card-action:hover::before {
    opacity: 1;
  }

  .action-text {
    position: relative;
    z-index: 1;
  }

  .action-icon {
    font-size: 1.25rem;
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .card-action:hover .action-icon {
    transform: translateX(4px);
  }

  /* ===== FOOTER ===== */
  .footer-retro {
    position: relative;
    padding: 4rem 2rem;
    text-align: center;
    font-size: 0.875rem;
    color: #78350f;
    overflow: hidden;
  }

  .footer-glow {
    position: absolute;
    top: -50px;
    left: 50%;
    transform: translateX(-50%);
    width: 400px;
    height: 100px;
    background: radial-gradient(ellipse at center, rgba(245, 158, 11, 0.1) 0%, transparent 70%);
    filter: blur(40px);
  }

  .footer-retro p {
    position: relative;
    margin: 0;
    letter-spacing: 0.05em;
  }

  /* ===== ANIMATIONS ===== */
  @keyframes fadeSlideUp {
    from {
      opacity: 0;
      transform: translateY(30px);
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

  @keyframes floatIn {
    0% {
      opacity: 0;
      transform: translateY(40px) scale(0.96);
    }
    100% {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes ambientPulse {
    0%, 100% {
      opacity: 1;
      transform: translateX(-50%) scale(1);
    }
    50% {
      opacity: 0.7;
      transform: translateX(-50%) scale(1.1);
    }
  }

  @keyframes glowPulse {
    0%, 100% {
      opacity: 0.6;
    }
    50% {
      opacity: 1;
    }
  }

  @keyframes borderGlow {
    0%, 100% {
      filter: blur(0.5px) brightness(1);
    }
    50% {
      filter: blur(1px) brightness(1.2);
    }
  }

  /* ===== RESPONSIVE ===== */
  @media (max-width: 1024px) {
    .hero-retro {
      padding: 6rem 2rem 4rem;
    }

    .tools-grid-retro {
      grid-template-columns: 1fr;
      max-width: 600px;
      margin: 0 auto;
    }
  }

  @media (max-width: 640px) {
    .hero-retro {
      padding: 5rem 1.5rem 3rem;
    }

    .hero-title {
      font-size: 3rem;
    }

    .catalog-header {
      flex-direction: column;
      gap: 1rem;
      align-items: flex-start;
    }

    .card-inner {
      padding: 2rem;
    }

    .card-icon {
      font-size: 2.5rem;
    }

    .card-title {
      font-size: 1.5rem;
    }
  }

  /* Accessibility: Reduced Motion */
  @media (prefers-reduced-motion: reduce) {
    .tool-card-retro,
    .title-main,
    .title-accent,
    .hero-subtitle,
    .hero-ambient,
    .hero-glow {
      animation: none !important;
      opacity: 1 !important;
      transform: none !important;
    }

    .card-action:hover,
    .tool-card-retro:hover,
    .card-icon {
      transform: none !important;
    }
  }
</style>
