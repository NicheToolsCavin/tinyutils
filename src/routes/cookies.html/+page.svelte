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
  <section class="card" aria-labelledby="cookiesHeading">
    <h2 id="cookiesHeading">Cookie &amp; privacy settings</h2>

    <p>
      TinyUtils keeps things simple: we don't run user accounts and we don't sell your personal data. We do rely on a
      small amount of technology from Google and our own local storage to keep the site running, understand which tools
      are useful, and, where enabled, show non-intrusive ads that help keep TinyUtils free.
    </p>

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

    <h3>Using an ad blocker?</h3>
    <p>
      Ads help cover the cost of bandwidth and development time so TinyUtils can stay free for everyone. If you use an
      ad blocker, that's okay — the tools will still work — but you can support TinyUtils by allowing ads on this site:
    </p>
    <ul>
      <li>Open your ad blocker's settings while on <code>tinyutils.net</code> or <code>www.tinyutils.net</code>.</li>
      <li>Look for an option like “allowlist site”, “trusted site”, or “enable on this site” and apply it to TinyUtils.</li>
      <li>Keep in mind we aim for non-intrusive, text-oriented ads and we never gate core features behind ads.</li>
    </ul>

    <h3>Privacy policy</h3>
    <p>
      For more detail about logs, data retention, and how URLs are processed, see our
      <a href="/privacy.html">Privacy</a> page.
    </p>
  </section>
</div>

<style>
  .card {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  button#tu-reopen-consent {
    padding: 10px 18px;
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-default);
    background: var(--surface-elevated);
    color: var(--text-primary);
    cursor: pointer;
  }

  button#tu-reopen-consent:hover {
    border-color: var(--brand-500);
  }

  .muted {
    color: var(--text-tertiary);
    min-height: 1.2em;
  }
</style>
