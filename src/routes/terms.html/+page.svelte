<svelte:head>
  <title>Terms — TinyUtils</title>
  <meta name="description" content="Usage terms for TinyUtils tools." />
  <link rel="canonical" href="/terms.html" />
  <meta property="og:title" content="Terms — TinyUtils" />
  <meta property="og:description" content="Usage terms for TinyUtils tools." />
</svelte:head>

<div class="container">
  <section class="legal-page fade-in-up" aria-labelledby="termsHeading">
    <h1 class="page-title" id="termsHeading">Terms of service</h1>

    <div class="glass-card">
      <p>
        TinyUtils is provided as-is, without warranties or guarantees. Use the tools at your own risk and
        validate results before acting on them. Do not use the tools to violate any applicable laws or the
        terms of the sites you crawl or fetch.
      </p>
    </div>

    <div class="glass-card">
      <p>
        We may update these terms from time to time. Continued use of the tools after changes take effect
        constitutes acceptance of the new terms.
      </p>
    </div>
  </section>
</div>

<style>
  /* ═══════════════════════════════════════════════════════════
     LIQUID GLASS LEGAL PAGE
     ═══════════════════════════════════════════════════════════ */

  .legal-page {
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

  .glass-card p {
    color: var(--text-secondary);
    line-height: 1.75;
    margin: 0;
    position: relative;
    z-index: 1;
  }

  /* Light mode */
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

  .fade-in-up {
    animation: fadeInUp 0.6s ease-out;
  }

  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(24px); }
    to { opacity: 1; /* No transform - allows hover transforms */ }
  }

  /* Accessibility: Respect reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .fade-in-up {
      animation: none !important;
    }
  }

  @media (max-width: 768px) {
    .legal-page { padding: var(--space-8) 0; }
    .glass-card { padding: var(--space-6); }
  }
</style>
