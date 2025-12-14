<script>
  import { page } from '/state';
  import { injectSpeedInsights } from '@vercel/speed-insights/sveltekit';

  const currentYear = new Date().getFullYear();

  injectSpeedInsights();
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
        <a
          href="/tools/"
          class:active={page.url.pathname.startsWith('/tools/')}
          aria-current={page.url.pathname.startsWith('/tools/') ? 'page' : undefined}
          >Tools</a
        >
        <a
          href="/blog/"
          class:active={page.url.pathname.startsWith('/blog')}
          aria-current={page.url.pathname.startsWith('/blog') ? 'page' : undefined}
          >Blog</a
        >
        <a
          href="/about.html"
          class:active={page.url.pathname === '/about.html'}
          aria-current={page.url.pathname === '/about.html' ? 'page' : undefined}
          >About</a
        >
        <a href="https://buymeacoffee.com/tinyutils" target="_blank" rel="noopener" class="support-link">☕ Support</a>
        <span class="nav-item">
          <a
            href="/privacy.html"
            class:active={
              page.url.pathname === '/privacy.html' ||
              page.url.pathname === '/cookies.html' ||
              page.url.pathname === '/terms.html'
            }
            aria-current={
              page.url.pathname === '/privacy.html' ||
              page.url.pathname === '/cookies.html' ||
              page.url.pathname === '/terms.html'
                ? 'page'
                : undefined
            }
            >Privacy</a
          >
          <div class="nav-dropdown">
            <a
              href="/cookies.html"
              class:active={page.url.pathname === '/cookies.html'}
              aria-current={page.url.pathname === '/cookies.html' ? 'page' : undefined}
              >Cookie settings</a
            >
            <a
              href="/privacy.html"
              class:active={page.url.pathname === '/privacy.html'}
              aria-current={page.url.pathname === '/privacy.html' ? 'page' : undefined}
              >Privacy policy</a
            >
            <a
              href="/terms.html"
              class:active={page.url.pathname === '/terms.html'}
              aria-current={page.url.pathname === '/terms.html' ? 'page' : undefined}
              >Terms of service</a
            >
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
