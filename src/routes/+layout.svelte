<script>
  const currentYear = new Date().getFullYear();
</script>

<svelte:head>
  <meta name="google-adsense-account" content="ca-pub-3079281180008443" />

  <link rel="icon" href="/icons/tinyutils-icon-dark-32.png" media="(prefers-color-scheme: dark)" />
  <link rel="icon" href="/icons/tinyutils-icon-light-32.png" media="(prefers-color-scheme: light)" />
  <link rel="icon" type="image/png" sizes="32x32" href="/icons/tinyutils-icon-dark-32.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="/icons/tinyutils-icon-light-180.png" />

  <link rel="stylesheet" href="/styles/site.css" />

  <script async src="https://fundingchoicesmessages.google.com/i/pub-3079281180008443?ers=1"></script>
  <script
    async
    src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3079281180008443"
    crossorigin="anonymous"
  ></script>
  <script src="/scripts/theme-toggle.js"></script>
  <script defer src="/scripts/consent.js"></script>
  <script defer src="/scripts/googlefc-consent-adapter.js"></script>
  <script defer src="/scripts/adsense-monitor.js"></script>
  <script defer src="/scripts/analytics.js"></script>
</svelte:head>

<a href="#main" class="skip-link">Skip to main content</a>

<header class="site-header">
  <div class="container row between center">
    <a class="brand" href="/">TinyUtils</a>
    <div class="row center">
      <nav class="nav">
        <a href="/tools/">Tools</a>
        <a href="/about.html">About</a>
        <a href="https://buymeacoffee.com/tinyutils" target="_blank" rel="noopener" class="support-link">☕ Support</a>
        <span class="nav-item">
          <a href="/privacy.html">Privacy</a>
          <div class="nav-dropdown">
            <a href="/cookies.html">Cookie settings</a>
            <a href="/privacy.html">Privacy policy</a>
            <a href="/terms.html">Terms of service</a>
          </div>
        </span>
      </nav>
      <button class="theme-toggle" type="button" data-theme-toggle aria-pressed="false">
        Dark
      </button>
    </div>
  </div>
</header>

<main id="main">
  <slot />
</main>

<footer class="site-footer">
  <div
    class="container row between wrap"
    style="padding: var(--space-8) var(--space-4); color: var(--text-tertiary);"
  >
    <span>
      © <span id="y">{currentYear}</span> TinyUtils
    </span>
    <span>
      <a href="/about.html" style="color: var(--text-tertiary)">About</a> ·
      <a href="https://buymeacoffee.com/tinyutils" target="_blank" rel="noopener" style="color: var(--brand-500)">☕ Support Us</a> ·
      <a href="/cookies.html" style="color: var(--text-tertiary)">Cookie &amp; privacy settings</a> ·
      <a href="/privacy.html" style="color: var(--text-tertiary)">Privacy</a> ·
      <a href="/terms.html" style="color: var(--text-tertiary)">Terms</a>
    </span>
  </div>
</footer>

<style>
  :global(.support-link) {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    border-radius: var(--radius-md);
    color: var(--text-secondary) !important;
    font-size: 0.9rem;
    opacity: 0.85;
    transition:
      color var(--transition-base),
      opacity var(--transition-base);
  }

  :global(.support-link:hover) {
    color: var(--brand-500) !important;
    opacity: 1;
  }

  :global(.nav-item) {
    position: relative;
    display: inline-block;
  }

  :global(.nav-dropdown) {
    display: none;
    position: absolute;
    top: 100%;
    right: 0;
    background: var(--surface-base);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    padding: var(--space-2);
    margin-top: var(--space-3);
    min-width: 200px;
    box-shadow: var(--shadow-xl);
    z-index: 1000;
  }

  :global(.nav-item:hover .nav-dropdown) {
    display: block;
  }

  :global(.nav-dropdown a) {
    display: block;
    padding: var(--space-2) var(--space-3);
    color: var(--text-primary);
    text-decoration: none;
    border-radius: var(--radius-md);
    transition: all var(--transition-base);
    font-size: var(--text-sm);
  }

  :global(.nav-dropdown a:hover) {
    background: var(--surface-raised);
    color: var(--brand-500);
  }
</style>
