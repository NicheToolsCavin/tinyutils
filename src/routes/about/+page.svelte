<svelte:head>
  <title>About — TinyUtils</title>
  <meta
    name="description"
    content="Learn what TinyUtils is, who it's for, and how we think about privacy and reliability."
  />
  <link rel="canonical" href="/about/" />
  <meta property="og:title" content="About — TinyUtils" />
  <meta
    property="og:description"
    content="Learn what TinyUtils is, who it's for, and how we think about privacy and reliability."
  />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="/og.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="icon" href="/favicon.ico" sizes="any" />
</svelte:head>

<div class="container">
  <section class="about-page fade-in-up" aria-labelledby="aboutHeading">
    <h1 class="page-title">About TinyUtils</h1>

    <div class="glass-card">
      <h2 id="aboutHeading">What is TinyUtils?</h2>
      <p>
        TinyUtils is a small collection of focused, browser-based tools for people who work with websites
        every day — SEOs, developers, content editors, and site owners. The goal is to make common,
        fiddly tasks (like checking dead links or comparing sitemaps) fast, reliable, and easy to repeat.
      </p>
    </div>

    <div class="glass-card">
      <h2>How it's built</h2>
      <p>
        The site is a static HTML/CSS/JavaScript front-end deployed on Vercel, plus a handful of
        serverless APIs for more complex work (like fetching metadata or converting documents). There are
        no user accounts or dashboards to manage — just tools you can open, use, and close again.
      </p>
    </div>

    <div class="glass-card">
      <h2>Privacy &amp; safety</h2>
      <p>
        TinyUtils does not run user logins or sell personal data. Some tools need to fetch URLs you paste
        to do their job; those requests are made on your behalf and may briefly appear in server logs for
        abuse prevention and debugging. For the full picture, see the
        <a href="/cookies.html">Cookie &amp; privacy settings</a> and <a href="/privacy.html">Privacy</a>
        pages.
      </p>
    </div>

    <div class="glass-card">
      <h2>Who it's for</h2>
      <p>
        These tools are designed for people who are comfortable working in the browser and reading raw
        results. They're intentionally minimal: no animations, no popups, and no onboarding flows. If you
        know what you're looking for, TinyUtils aims to get you there quickly and stay out of your way.
      </p>
    </div>

    <div class="glass-card cta-card">
      <h2>How to help</h2>
      <p>If a tool saves you time, the best way to support TinyUtils is to share it with a colleague.</p>
      <a class="btn primary" href="https://buymeacoffee.com/tinyutils" target="_blank" rel="noopener">Support TinyUtils →</a>
    </div>
  </section>
</div>

<style>
  /* ═══════════════════════════════════════════════════════════
     LIQUID GLASS ABOUT PAGE
     ═══════════════════════════════════════════════════════════ */

  .about-page {
    padding: var(--space-12) 0 var(--space-16);
    max-width: 720px;
    margin: 0 auto;
  }

  .page-title {
    font-size: clamp(2rem, 5vw, 3rem);
    font-weight: var(--font-bold);
    background: var(--accent-gradient);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    text-align: center;
    margin-bottom: var(--space-10);
    letter-spacing: -0.02em;
  }

  .glass-card {
    position: relative;
    background: var(--glass-bg);
    backdrop-filter: blur(var(--glass-blur));
    -webkit-backdrop-filter: blur(var(--glass-blur));
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-2xl);
    padding: var(--space-8);
    margin-bottom: var(--space-6);
    overflow: hidden;
    transition: all 0.3s ease;
  }

  .glass-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--glass-highlight), transparent);
    opacity: 0.6;
  }

  .glass-card::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 50%;
    background: var(--glass-shine);
    pointer-events: none;
    opacity: 0.4;
  }

  .glass-card:hover {
    border-color: var(--accent-primary);
    box-shadow: 0 12px 40px var(--glass-shadow);
  }

  .glass-card h2 {
    font-size: var(--text-xl);
    font-weight: var(--font-semibold);
    color: var(--text-primary);
    margin: 0 0 var(--space-4);
    position: relative;
    z-index: 1;
  }

  .glass-card p {
    color: var(--text-secondary);
    line-height: 1.75;
    margin: 0;
    position: relative;
    z-index: 1;
  }

  .glass-card a {
    color: var(--accent-primary);
    text-decoration: none;
    font-weight: var(--font-medium);
    transition: all 0.2s ease;
  }

  .glass-card a:hover {
    text-decoration: underline;
    color: var(--accent-secondary);
  }

  .cta-card {
    text-align: center;
  }

  .cta-card .btn {
    margin-top: var(--space-6);
    position: relative;
    z-index: 1;
  }

  /* Light mode enhancements */
  :global(html[data-theme="light"]) .glass-card {
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06),
                inset 0 1px 0 rgba(255, 255, 255, 0.9);
  }

  :global(html[data-theme="light"]) .glass-card:hover {
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1),
                inset 0 1px 0 rgba(255, 255, 255, 0.9);
  }

  :global(html[data-theme="light"]) .glass-card::after {
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.7) 0%, transparent 100%);
    opacity: 1;
  }

  /* Staggered animations */
  .fade-in-up {
    animation: fadeInUp 0.6s ease-out;
  }

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(24px);
    }
    to {
      opacity: 1;
      /* No transform - allows hover transforms to work */
    }
  }

  /* Accessibility: Respect reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .fade-in-up {
      animation: none !important;
    }
  }

  /* Responsive */
  @media (max-width: 768px) {
    .about-page {
      padding: var(--space-8) 0;
    }

    .glass-card {
      padding: var(--space-6);
    }
  }
</style>
