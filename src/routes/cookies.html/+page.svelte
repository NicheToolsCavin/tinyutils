<script>
  import { onMount } from 'svelte';

  let status = '';
  let reopenBtn;

  const setStatus = (msg) => {
    status = msg || '';
  };

  onMount(() => {
    if (!reopenBtn) return;

    reopenBtn.disabled = true;
    setStatus('Checking for Google consent controls…');

    if (typeof window === 'undefined') return;

    window.googlefc = window.googlefc || {};
    window.googlefc.callbackQueue = window.googlefc.callbackQueue || [];
    window.googlefc.callbackQueue.push({
      CONSENT_API_READY: () => {
        reopenBtn.disabled = false;
        setStatus('');

        reopenBtn.addEventListener('click', () => {
          try {
            if (typeof window.googlefc.showRevocationMessage === 'function') {
              setStatus('Asking Google to reopen your consent choices…');
              window.googlefc.showRevocationMessage();
            } else {
              setStatus(
                'Consent controls are not available on this page. If needed, clear cookies/site data in your browser to start over.'
              );
            }
          } catch (e) {
            setStatus(
              'We could not reopen the Google consent box automatically. You can also clear cookies/site data in your browser to start over.'
            );
          }
        });
      }
    });
  });
</script>

<svelte:head>
  <title>Cookie &amp; privacy settings — TinyUtils</title>
  <meta
    name="description"
    content="Manage how TinyUtils uses cookies and local storage for analytics and ads, and learn how ads help keep the site free."
  />
  <link rel="canonical" href="/cookies.html" />
  <meta property="og:title" content="Cookie &amp; privacy settings — TinyUtils" />
  <meta
    property="og:description"
    content="Manage how TinyUtils uses cookies and local storage for analytics and ads, and learn how ads help keep the site free."
  />
  <meta property="og:image" content="/og.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="icon" href="/favicon.ico" sizes="any" />
</svelte:head>

<div class="container">
  <section class="legal-page fade-in-up" aria-labelledby="cookiesHeading">
    <h1 class="page-title" id="cookiesHeading">Cookie &amp; privacy settings</h1>

    <div class="glass-card">
      <p>
        TinyUtils keeps things simple: we don't run user accounts and we don't sell your personal data. We do rely on a
        small amount of technology from Google and our own local storage to keep the site running, understand which tools
        are useful, and, where enabled, show non-intrusive ads that help keep TinyUtils free.
      </p>
    </div>

    <div class="glass-card">
      <h3>What we use</h3>
      <ul>
        <li>
          <strong>Analytics</strong> — We may use privacy-friendly analytics to understand which pages are used the most.
          When analytics are on, we measure visits in aggregate; you can turn them off at any time.
        </li>
        <li>
          <strong>Ads (Google AdSense)</strong> — On some pages we show Google Ads. Google may use cookies or local storage
          to show and measure ads. TinyUtils does not get access to your raw ad profiles; consent for ads and measurement
          is handled by Google's own consent tools.
        </li>
        <li>
          <strong>Local storage</strong> — We store a small preference for hiding certain ad-related UI (<code
            >tu-ads-hidden</code
          >) in your browser so we can remember if you chose to hide ad slots. This does not change how Google serves ads,
          only how much ad UI we render.
        </li>
      </ul>
      <p>
        For details about how Google uses information from sites like ours, see
        <a href="https://business.safety.google/privacy/" target="_blank" rel="noreferrer"
          >Google's Privacy &amp; Terms for partners</a
        >.
      </p>
    </div>

    <div class="glass-card">
      <h3>Change your ad &amp; cookie choices</h3>
      <p>
        If you are in a region where Google requires it (for example, the EU/EEA or UK), you may see a Google-branded box
        with three options the first time you visit TinyUtils. That box is provided by Google Funding Choices and reflects
        your current consent choices for ads and measurement.
      </p>
      <ol>
        <li>Click the button below to ask Google to show that consent box again on this device, when it applies.</li>
        <li>Or use your browser's privacy or cookie settings to clear site data and start over, if you prefer.</li>
      </ol>
      <p><button id="tu-reopen-consent" type="button" bind:this={reopenBtn}>Review Google analytics &amp; ads choices</button></p>
      <p id="tu-reopen-consent-status" class="muted">{status}</p>
    </div>

    <div class="glass-card">
      <h3>Using an ad blocker?</h3>
      <p>
        Ads help cover the cost of bandwidth and development time so TinyUtils can stay free for everyone. If you use an
        ad blocker, that's okay — the tools will still work — but you can support TinyUtils by allowing ads on this site:
      </p>
      <ul>
        <li>Open your ad blocker's settings while on <code>tinyutils.net</code> or <code>www.tinyutils.net</code>.</li>
        <li>Look for an option like "allowlist site", "trusted site", or "enable on this site" and apply it to TinyUtils.</li>
        <li>Keep in mind we aim for non-intrusive, text-oriented ads and we never gate core features behind ads.</li>
      </ul>
    </div>

    <div class="glass-card">
      <h3>Privacy policy</h3>
      <p>
        For more detail about logs, data retention, and how URLs are processed, see our
        <a href="/privacy.html">Privacy</a> page.
      </p>
    </div>
  </section>
</div>

<style>
  /* ═══════════════════════════════════════════════════════════
     LIQUID GLASS COOKIES PAGE
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

  .glass-card h3 {
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
    margin: 0 0 var(--space-4);
    position: relative;
    z-index: 1;
  }

  .glass-card p:last-child {
    margin-bottom: 0;
  }

  .glass-card ul,
  .glass-card ol {
    color: var(--text-secondary);
    line-height: 1.7;
    padding-left: var(--space-6);
    margin: 0 0 var(--space-4);
    position: relative;
    z-index: 1;
  }

  .glass-card li {
    margin-bottom: var(--space-2);
  }

  .glass-card code {
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    padding: 2px 6px;
    border-radius: var(--radius-md);
    font-size: 0.88em;
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

  /* Glass button */
  button#tu-reopen-consent {
    position: relative;
    z-index: 1;
    padding: 12px 20px;
    border-radius: var(--radius-xl);
    border: 1px solid var(--glass-border);
    background: var(--glass-bg);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    color: var(--text-primary);
    font-weight: var(--font-medium);
    cursor: pointer;
    transition: all 0.3s ease;
  }

  button#tu-reopen-consent:hover {
    border-color: var(--accent-primary);
    background: var(--glass-bg-hover);
    transform: translateY(-2px);
  }

  .muted {
    color: var(--text-tertiary);
    min-height: 1.2em;
    font-size: var(--text-sm);
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

  :global(html[data-theme="light"]) button#tu-reopen-consent {
    background: rgba(255, 255, 255, 0.6);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
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
