<svelte:head>
  <title>Privacy — TinyUtils</title>
  <meta
    name="description"
    content="Privacy posture for TinyUtils: no logins, no selling personal data, and limited operational logging via Vercel."
  />
  <link rel="canonical" href="/privacy.html" />
  <meta property="og:title" content="Privacy — TinyUtils" />
  <meta
    property="og:description"
    content="Privacy posture for TinyUtils: no logins, no selling personal data, and limited operational logging via Vercel."
  />
</svelte:head>

<div class="container">
  <section class="legal-page fade-in-up" aria-labelledby="privacyHeading">
    <h1 class="page-title" id="privacyHeading">Privacy</h1>

    <div class="glass-card">
      <p>
        No login, no user accounts, and no selling of your personal data. TinyUtils runs on Vercel's
        infrastructure, which maintains server logs (including URLs and IP addresses) for operational
        purposes. We don't directly access or sell this data, but Vercel retains logs per their own
        policies.
      </p>
    </div>

    <div class="glass-card">
      <p>
        We may use privacy-friendly analytics to understand which tools are used the most; when analytics
        are on, measurements are aggregated and you can disable them at any time. For a detailed view of
        cookies, ads, and local storage, see our <a href="/cookies.html">Cookie &amp; privacy settings</a>
        page.
      </p>
    </div>

    <div class="glass-card">
      <p>
        Google Ads (AdSense) may appear on some pages. Google may use cookies or similar technologies to
        deliver and measure ads; TinyUtils does not get access to your raw ad profile. For more about how
        Google uses information from sites like ours, see
        <a href="https://business.safety.google/privacy/" target="_blank" rel="noreferrer"
          >Google's Privacy &amp; Terms for partners</a
        >.
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

  .glass-card a {
    color: var(--accent-primary);
    text-decoration: none;
    font-weight: var(--font-medium);
  }

  .glass-card a:hover {
    text-decoration: underline;
    color: var(--accent-secondary);
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
