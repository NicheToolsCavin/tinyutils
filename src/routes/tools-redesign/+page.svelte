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
      description: 'Crawl your entire website and identify broken links, redirects, and HTTP errors.',
      tags: ['SEO', 'Maintenance', 'Crawling'],
      href: '/tools/dead-link-finder/',
      color: '#FF6B9D',
      gradient: 'linear-gradient(135deg, #FF6B9D 0%, #FEC163 100%)',
      featured: true,
      size: 'large'
    },
    {
      icon: '📄',
      name: 'Document Converter',
      category: 'Content Tools',
      description: 'Convert between 100+ document formats. Markdown, PDF, DOCX, HTML, RTF, ODT, LaTeX.',
      tags: ['Pandoc', 'Batch', '100+ formats'],
      href: '/tools/text-converter/',
      color: '#A78BFA',
      gradient: 'linear-gradient(135deg, #A78BFA 0%, #EC4899 100%)',
      featured: true,
      size: 'large'
    },
    {
      icon: '🗺️',
      name: 'Sitemap Delta',
      category: 'Site Health',
      description: 'Compare two sitemaps to find added, removed, and changed URLs.',
      tags: ['Migration', 'Redirects', 'SEO'],
      href: '/tools/sitemap-delta/',
      color: '#10B981',
      gradient: 'linear-gradient(135deg, #10B981 0%, #06B6D4 100%)',
      size: 'medium'
    },
    {
      icon: '⏪',
      name: 'Wayback Fixer',
      category: 'Site Health',
      description: 'Map broken links to Internet Archive snapshots.',
      tags: ['Archive', 'Recovery'],
      href: '/tools/wayback-fixer/',
      color: '#F59E0B',
      gradient: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
      size: 'medium'
    },
    {
      icon: '🧬',
      name: 'CSV Joiner',
      category: 'Data Tools',
      description: 'Merge two CSV/TSV files on a shared column.',
      tags: ['Merge', 'Join'],
      href: '/tools/csv-joiner/',
      color: '#3B82F6',
      gradient: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
      size: 'small'
    },
    {
      icon: '🥨',
      name: 'JSON ↔ CSV',
      category: 'Data Tools',
      description: 'Flatten nested JSON into CSV.',
      tags: ['JSONL', 'Flatten'],
      href: '/tools/json-to-csv/',
      color: '#EC4899',
      gradient: 'linear-gradient(135deg, #EC4899 0%, #F43F5E 100%)',
      size: 'small'
    }
  ];

  // 3D tilt effect
  function handleMouseMove(e, card) {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = (y - centerY) / 10;
    const rotateY = (centerX - x) / 10;

    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`;
  }

  function handleMouseLeave(card) {
    card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
  }
</script>

<svelte:head>
  <title>TinyUtils — Professional Web Tools</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
</svelte:head>

<main class="liquid-glass" class:mounted>
  <!-- Animated mesh gradient background -->
  <div class="mesh-bg">
    <div class="gradient-orb orb-1"></div>
    <div class="gradient-orb orb-2"></div>
    <div class="gradient-orb orb-3"></div>
    <div class="gradient-orb orb-4"></div>
  </div>

  <!-- Floating decorative blobs -->
  <div class="blob blob-1"></div>
  <div class="blob blob-2"></div>
  <div class="blob blob-3"></div>

  <!-- Floating Frosted Glass Nav -->
  <nav class="glass-nav">
    <div class="nav-content">
      <a href="/" class="nav-logo">
        <span class="logo-icon">⚡</span>
        <span class="logo-text">TinyUtils</span>
      </a>
      <div class="nav-links">
        <a href="/tools/" class="nav-link">Tools</a>
        <a href="/about.html" class="nav-link">About</a>
        <a href="https://buymeacoffee.com/tinyutils" target="_blank" rel="noopener" class="nav-link nav-link-special">
          <span>☕</span>
          <span>Support</span>
        </a>
      </div>
    </div>
  </nav>

  <!-- Hero Section -->
  <header class="hero">
    <div class="hero-content">
      <div class="sparkle-container">
        <span class="sparkle">✨</span>
        <span class="sparkle-orbit">💫</span>
      </div>
      <h1 class="hero-title">
        Professional tools<br/>
        that feel like <span class="magic">magic</span>
      </h1>
      <p class="hero-subtitle">
        Production-ready utilities for developers, SEO teams, and content pros.
        <br/>Zero installation. Maximum delight.
      </p>
    </div>
  </header>

  <!-- Tools Bento Grid -->
  <section class="tools-section">
    <div class="bento-grid">
      {#each tools as tool, i}
        <article
          class="glass-card size-{tool.size}"
          class:featured={tool.featured}
          style="--tool-color: {tool.color}; --tool-gradient: {tool.gradient}; --delay: {i * 0.08}s"
          on:mousemove={(e) => handleMouseMove(e, e.currentTarget)}
          on:mouseleave={(e) => handleMouseLeave(e.currentTarget)}
        >
          <!-- Glow effect -->
          <div class="card-glow"></div>

          <!-- Liquid morphing blob decoration -->
          <div class="liquid-blob"></div>

          <!-- Glass surface -->
          <div class="glass-surface">
            <!-- Floating badge for featured -->
            {#if tool.featured}
              <div class="featured-badge">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#FFD700" stroke="#FFD700" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span>Popular</span>
              </div>
            {/if}

            <!-- Header -->
            <div class="card-header">
              <div class="icon-container">
                <span class="card-icon">{tool.icon}</span>
                <div class="icon-glow"></div>
              </div>
              <span class="card-category">{tool.category}</span>
            </div>

            <!-- Content -->
            <h3 class="card-title">{tool.name}</h3>
            <p class="card-description">{tool.description}</p>

            <!-- Tags -->
            <div class="card-tags">
              {#each tool.tags as tag}
                <span class="tag">
                  <span class="tag-dot"></span>
                  {tag}
                </span>
              {/each}
            </div>

            <!-- CTA -->
            <a href={tool.href} class="card-cta">
              <span class="cta-bg"></span>
              <span class="cta-content">
                <span>Launch tool</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M1 8H15M15 8L8 1M15 8L8 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </span>
            </a>
          </div>

          <!-- Shine effect -->
          <div class="card-shine"></div>

          <!-- Corner decorations -->
          <div class="corner-decoration corner-tl"></div>
          <div class="corner-decoration corner-br"></div>
        </article>
      {/each}
    </div>
  </section>

  <!-- Footer -->
  <footer class="footer">
    <div class="footer-glass">
      <p>Crafted with care by professionals for professionals</p>
      <div class="footer-sparkles">
        <span>✨</span>
        <span>💎</span>
        <span>⚡</span>
      </div>
    </div>
  </footer>
</main>

<style>
  * {
    box-sizing: border-box;
  }

  /* Hide the default site header on this page */
  :global(.site-header) {
    display: none;
  }

  .liquid-glass {
    min-height: 100vh;
    background: #0a0a0a;
    font-family: 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif;
    color: #ffffff;
    padding: 0;
    margin: 0;
    position: relative;
    overflow-x: hidden;
  }

  /* ===== ANIMATED MESH BACKGROUND ===== */
  .mesh-bg {
    position: fixed;
    inset: 0;
    z-index: 0;
    overflow: hidden;
  }

  .gradient-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(120px);
    opacity: 0.5;
    animation: float 20s ease-in-out infinite;
  }

  .orb-1 {
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, #FF6B9D 0%, transparent 70%);
    top: -200px;
    left: -200px;
    animation-delay: 0s;
  }

  .orb-2 {
    width: 500px;
    height: 500px;
    background: radial-gradient(circle, #A78BFA 0%, transparent 70%);
    top: 20%;
    right: -150px;
    animation-delay: 5s;
  }

  .orb-3 {
    width: 550px;
    height: 550px;
    background: radial-gradient(circle, #10B981 0%, transparent 70%);
    bottom: -100px;
    left: 30%;
    animation-delay: 10s;
  }

  .orb-4 {
    width: 450px;
    height: 450px;
    background: radial-gradient(circle, #F59E0B 0%, transparent 70%);
    top: 60%;
    right: 20%;
    animation-delay: 15s;
  }

  @keyframes float {
    0%, 100% {
      transform: translate(0, 0) scale(1);
    }
    33% {
      transform: translate(50px, -50px) scale(1.1);
    }
    66% {
      transform: translate(-50px, 50px) scale(0.9);
    }
  }

  /* ===== FLOATING BLOBS ===== */
  .blob {
    position: fixed;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
    pointer-events: none;
    z-index: 1;
    animation: blob-float 15s ease-in-out infinite;
  }

  .blob-1 {
    width: 300px;
    height: 300px;
    top: 10%;
    right: 10%;
    animation-delay: 0s;
  }

  .blob-2 {
    width: 200px;
    height: 200px;
    bottom: 20%;
    left: 5%;
    animation-delay: 5s;
  }

  .blob-3 {
    width: 250px;
    height: 250px;
    top: 50%;
    left: 40%;
    animation-delay: 10s;
  }

  @keyframes blob-float {
    0%, 100% {
      transform: translate(0, 0);
    }
    50% {
      transform: translate(100px, -100px);
    }
  }

  /* ===== FLOATING GLASS NAV ===== */
  .glass-nav {
    position: fixed;
    top: 1.5rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000;
    opacity: 0;
    animation: navSlideDown 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.5s forwards;
  }

  @keyframes navSlideDown {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }

  .nav-content {
    display: flex;
    align-items: center;
    gap: 2rem;
    padding: 0.75rem 1.5rem;
    background: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 100px;
    box-shadow:
      0 8px 32px rgba(0, 0, 0, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.15);
  }

  .nav-logo {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    text-decoration: none;
    color: #ffffff;
    font-family: 'Syne', sans-serif;
    font-weight: 700;
    font-size: 1.125rem;
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .nav-logo:hover {
    transform: scale(1.05);
  }

  .logo-icon {
    font-size: 1.5rem;
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.1);
    }
  }

  .nav-links {
    display: flex;
    align-items: center;
    gap: 1.5rem;
  }

  .nav-link {
    color: rgba(255, 255, 255, 0.9);
    text-decoration: none;
    font-size: 0.9375rem;
    font-weight: 600;
    transition: color 0.2s ease;
    position: relative;
  }

  .nav-link::after {
    content: '';
    position: absolute;
    bottom: -4px;
    left: 0;
    width: 0;
    height: 2px;
    background: linear-gradient(90deg, #FF6B9D, #A78BFA, #10B981);
    transition: width 0.3s ease;
  }

  .nav-link:hover {
    color: #ffffff;
  }

  .nav-link:hover::after {
    width: 100%;
  }

  .nav-link-special {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.5rem 1rem;
    background: rgba(255, 255, 255, 0.12);
    border-radius: 100px;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .nav-link-special:hover {
    background: linear-gradient(135deg, #FF6B9D 0%, #A78BFA 100%);
    border-color: transparent;
  }

  .nav-link-special::after {
    display: none;
  }

  /* ===== HERO ===== */
  .hero {
    position: relative;
    z-index: 2;
    max-width: 1200px;
    margin: 0 auto;
    padding: 10rem 2rem 5rem;
    text-align: center;
  }

  .hero-content {
    max-width: 800px;
    margin: 0 auto;
  }

  .sparkle-container {
    position: relative;
    margin-bottom: 1rem;
    height: 70px;
  }

  .sparkle {
    font-size: 3.5rem;
    display: inline-block;
    opacity: 0;
    animation: sparkle 2s ease-in-out infinite, fadeSlideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards;
  }

  .sparkle-orbit {
    position: absolute;
    font-size: 1.75rem;
    top: 0;
    left: 50%;
    animation: orbit 4s linear infinite;
  }

  @keyframes orbit {
    0% {
      transform: translate(-50%, 0) rotate(0deg) translateX(60px) rotate(0deg);
    }
    100% {
      transform: translate(-50%, 0) rotate(360deg) translateX(60px) rotate(-360deg);
    }
  }

  @keyframes sparkle {
    0%, 100% {
      transform: scale(1) rotate(0deg);
    }
    50% {
      transform: scale(1.2) rotate(10deg);
    }
  }

  .hero-title {
    font-family: 'Syne', sans-serif;
    font-size: clamp(2.75rem, 7vw, 5rem);
    font-weight: 800;
    line-height: 1.1;
    margin: 0 0 2rem;
    letter-spacing: -0.03em;
    opacity: 0;
    animation: fadeSlideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards;
  }

  .magic {
    background: linear-gradient(135deg, #FF6B9D 0%, #A78BFA 50%, #10B981 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    display: inline-block;
    position: relative;
  }

  .magic::after {
    content: '';
    position: absolute;
    bottom: -10px;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #FF6B9D 0%, #A78BFA 50%, #10B981 100%);
    border-radius: 2px;
    animation: shimmer 2s ease-in-out infinite;
  }

  @keyframes shimmer {
    0%, 100% {
      opacity: 0.5;
      transform: scaleX(1);
    }
    50% {
      opacity: 1;
      transform: scaleX(1.05);
    }
  }

  .hero-subtitle {
    font-size: 1.25rem;
    line-height: 1.7;
    color: rgba(255, 255, 255, 0.7);
    margin: 0;
    font-weight: 400;
    opacity: 0;
    animation: fadeSlideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards;
  }

  /* ===== TOOLS SECTION ===== */
  .tools-section {
    position: relative;
    z-index: 2;
    max-width: 1400px;
    margin: 0 auto;
    padding: 2rem 2rem 8rem;
  }

  .bento-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1.5rem;
    grid-auto-rows: 280px;
  }

  /* ===== GLASS CARDS ===== */
  .glass-card {
    position: relative;
    opacity: 0;
    transform: translateY(40px);
    animation: cardEnter 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    animation-delay: var(--delay);
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    transform-style: preserve-3d;
    cursor: pointer;
    overflow: hidden;
    border-radius: 24px;
  }

  /* Different sizes for bento grid */
  .size-large {
    grid-column: span 2;
    grid-row: span 2;
  }

  .size-medium {
    grid-column: span 2;
    grid-row: span 1;
  }

  .size-small {
    grid-column: span 1;
    grid-row: span 1;
  }

  .glass-card:hover .card-glow {
    opacity: 0.6;
  }

  /* Glow effect - hover only, less bright */
  .card-glow {
    position: absolute;
    inset: -20px;
    background: var(--tool-gradient);
    border-radius: 32px;
    opacity: 0;
    filter: blur(40px);
    transition: opacity 0.5s ease;
    z-index: 0;
    animation: pulse-glow 3s ease-in-out infinite;
  }

  @keyframes pulse-glow {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.05);
    }
  }

  /* Liquid morphing blob - toned down */
  .liquid-blob {
    position: absolute;
    width: 200px;
    height: 200px;
    top: -50px;
    right: -50px;
    background: radial-gradient(circle, var(--tool-color) 0%, transparent 70%);
    border-radius: 50%;
    opacity: 0.08;
    filter: blur(60px);
    z-index: 0;
    animation: morph 8s ease-in-out infinite;
  }

  @keyframes morph {
    0%, 100% {
      border-radius: 50% 50% 50% 50%;
      transform: rotate(0deg);
    }
    33% {
      border-radius: 60% 40% 50% 50%;
      transform: rotate(120deg);
    }
    66% {
      border-radius: 50% 60% 40% 50%;
      transform: rotate(240deg);
    }
  }

  /* Glass surface */
  .glass-surface {
    position: relative;
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 24px;
    padding: 2rem;
    height: 100%;
    display: flex;
    flex-direction: column;
    z-index: 1;
    transition: all 0.3s ease;
    box-shadow:
      0 8px 32px rgba(0, 0, 0, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  .size-large .glass-surface {
    padding: 2.5rem;
  }

  .glass-card:hover .glass-surface {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.2);
  }

  /* Featured badge */
  .featured-badge {
    position: absolute;
    top: 1rem;
    right: 1rem;
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.75rem;
    background: rgba(255, 215, 0, 0.12);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 215, 0, 0.3);
    border-radius: 100px;
    font-size: 0.75rem;
    font-weight: 600;
    color: #FFD700;
    animation: badge-float 3s ease-in-out infinite;
  }

  .featured-badge svg {
    width: 14px;
    height: 14px;
  }

  @keyframes badge-float {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-5px);
    }
  }

  /* Shine effect */
  .card-shine {
    position: absolute;
    top: 0;
    left: -75%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
    border-radius: 24px;
    z-index: 2;
    pointer-events: none;
    transition: left 0.6s ease;
  }

  .glass-card:hover .card-shine {
    left: 75%;
  }

  /* Corner decorations */
  .corner-decoration {
    position: absolute;
    width: 20px;
    height: 20px;
    border: 2px solid var(--tool-color);
    z-index: 3;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .glass-card:hover .corner-decoration {
    opacity: 0.5;
  }

  .corner-tl {
    top: 10px;
    left: 10px;
    border-right: none;
    border-bottom: none;
    border-radius: 4px 0 0 0;
  }

  .corner-br {
    bottom: 10px;
    right: 10px;
    border-left: none;
    border-top: none;
    border-radius: 0 0 4px 0;
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.5rem;
  }

  .icon-container {
    position: relative;
  }

  .card-icon {
    font-size: 3rem;
    line-height: 1;
    transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    display: inline-block;
    position: relative;
    z-index: 1;
  }

  .size-large .card-icon {
    font-size: 4rem;
  }

  .icon-glow {
    position: absolute;
    inset: -10px;
    background: radial-gradient(circle, var(--tool-color) 0%, transparent 70%);
    opacity: 0;
    filter: blur(20px);
    transition: opacity 0.4s ease;
  }

  .glass-card:hover .card-icon {
    transform: scale(1.2) rotate(10deg);
  }

  .glass-card:hover .icon-glow {
    opacity: 0.3;
  }

  .card-category {
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.6);
    background: rgba(255, 255, 255, 0.05);
    padding: 0.5rem 1rem;
    border-radius: 100px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .card-title {
    font-family: 'Syne', sans-serif;
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0 0 1rem;
    color: #ffffff;
    line-height: 1.2;
  }

  .size-large .card-title {
    font-size: 2rem;
    margin-bottom: 1.5rem;
  }

  .card-description {
    font-size: 0.9375rem;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.7);
    margin: 0 0 1.5rem;
    font-weight: 400;
    flex: 1;
  }

  .size-large .card-description {
    font-size: 1.0625rem;
  }

  .card-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }

  .tag {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--tool-color);
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--tool-color);
    padding: 0.375rem 0.75rem;
    border-radius: 8px;
    transition: all 0.2s ease;
  }

  .tag-dot {
    width: 4px;
    height: 4px;
    background: var(--tool-color);
    border-radius: 50%;
  }

  .glass-card:hover .tag {
    background: var(--tool-color);
    color: #000000;
    transform: translateY(-2px);
  }

  .glass-card:hover .tag-dot {
    background: #000000;
  }

  .card-cta {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    font-weight: 700;
    color: #000000;
    text-decoration: none;
    padding: 1rem 2rem;
    border-radius: 12px;
    position: relative;
    overflow: hidden;
  }

  .cta-bg {
    position: absolute;
    inset: 0;
    background: #ffffff;
    transition: all 0.3s ease;
  }

  .cta-content {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    color: #000000;
    transition: color 0.3s ease;
  }

  .card-cta:hover .cta-bg {
    background: var(--tool-gradient);
  }

  .card-cta:hover .cta-content {
    color: #ffffff;
  }

  .card-cta:hover {
    transform: translateY(-4px) scale(1.05);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.4);
  }

  .card-cta:active {
    transform: translateY(-2px) scale(1.02);
  }

  .cta-content svg {
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .card-cta:hover .cta-content svg {
    transform: translateX(4px);
  }

  /* ===== FOOTER ===== */
  .footer {
    position: relative;
    z-index: 2;
    max-width: 1200px;
    margin: 0 auto;
    padding: 4rem 2rem;
    display: flex;
    justify-content: center;
  }

  .footer-glass {
    padding: 2rem 3rem;
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 24px;
    text-align: center;
    box-shadow:
      0 8px 32px rgba(0, 0, 0, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  .footer-glass p {
    margin: 0 0 1rem;
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.5);
  }

  .footer-sparkles {
    display: flex;
    justify-content: center;
    gap: 1rem;
    font-size: 1.25rem;
  }

  .footer-sparkles span {
    animation: sparkle 2s ease-in-out infinite;
  }

  .footer-sparkles span:nth-child(2) {
    animation-delay: 0.3s;
  }

  .footer-sparkles span:nth-child(3) {
    animation-delay: 0.6s;
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

  @keyframes cardEnter {
    from {
      opacity: 0;
      transform: translateY(40px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* ===== RESPONSIVE ===== */
  @media (max-width: 1024px) {
    .bento-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .size-large {
      grid-column: span 2;
    }

    .size-medium {
      grid-column: span 2;
    }

    .size-small {
      grid-column: span 1;
    }
  }

  @media (max-width: 768px) {
    .hero {
      padding: 8rem 1.5rem 4rem;
    }

    .hero-title {
      font-size: 2.5rem;
    }

    .nav-content {
      padding: 0.5rem 1rem;
      gap: 1rem;
    }

    .nav-links {
      gap: 0.75rem;
    }

    .nav-link {
      font-size: 0.875rem;
    }

    .tools-section {
      padding: 1.5rem 1.5rem 6rem;
    }

    .bento-grid {
      grid-template-columns: 1fr;
      grid-auto-rows: auto;
    }

    .size-large,
    .size-medium,
    .size-small {
      grid-column: span 1;
      grid-row: span 1;
    }

    .glass-surface {
      padding: 1.5rem;
    }
  }

  /* ===== ACCESSIBILITY ===== */
  @media (prefers-reduced-motion: reduce) {
    .glass-card,
    .sparkle,
    .sparkle-orbit,
    .hero-title,
    .hero-subtitle,
    .gradient-orb,
    .blob,
    .liquid-blob,
    .featured-badge {
      animation: none !important;
    }

    .glass-card {
      opacity: 1 !important;
      transform: none !important;
    }

    .card-cta:hover,
    .card-icon {
      transform: none !important;
    }
  }
</style>
