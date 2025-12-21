<script>
  import { page } from '$app/state';
  import { browser } from '$app/environment';
  import { injectSpeedInsights } from '@vercel/speed-insights/sveltekit';

  const currentYear = new Date().getFullYear();

  injectSpeedInsights();

  // Navigation active state helpers (computed once per route change, not on every render)
  let isToolsActive = $derived(page.url.pathname === '/tools' || page.url.pathname.startsWith('/tools/'));
  let isBlogActive = $derived(page.url.pathname.startsWith('/blog'));
  let isAboutActive = $derived(page.url.pathname.startsWith('/about'));
  let isPrivacyActive = $derived(
    page.url.pathname === '/privacy.html' ||
    page.url.pathname === '/cookies.html' ||
    page.url.pathname === '/terms.html'
  );

  // Theme management
  let theme = $state('dark');

  function getPreferredTheme() {
    if (!browser) return 'dark';
    const stored = localStorage.getItem('theme');
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function setTheme(newTheme) {
    theme = newTheme;
    if (browser) {
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
    }
  }

  function toggleTheme() {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }

  // Initialize theme on mount
  $effect(() => {
    if (browser) {
      const preferredTheme = getPreferredTheme();
      setTheme(preferredTheme);

      // Listen for system preference changes
      const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
      const handleChange = (e) => {
        if (!localStorage.getItem('theme')) {
          setTheme(e.matches ? 'light' : 'dark');
        }
      };
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  });
</script>

<svelte:head>
  <meta name="google-adsense-account" content="ca-pub-3079281180008443" />

  <!-- Inter font for liquid glass design -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">

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
  <script defer src="/scripts/consent.js"></script>
  <script defer src="/scripts/googlefc-consent-adapter.js"></script>
  <script defer src="/scripts/adsense-monitor.js"></script>
  <script defer src="/scripts/analytics.js"></script>
</svelte:head>

<!-- Animated background orbs - 3 orbs: blue, purple, cyan -->
<div class="bg-orbs">
  <div class="orb orb-1"></div>
  <div class="orb orb-2"></div>
  <div class="orb orb-3"></div>
</div>

<a href="#main" class="skip-link">Skip to main content</a>

<header class="site-header">
  <div class="header-inner glass">
    <a class="brand" href="/">TinyUtils</a>
    <nav class="nav">
      <a
        href="/tools/"
        class:active={isToolsActive}
        aria-current={isToolsActive ? 'page' : undefined}
        data-sveltekit-preload-data="hover"
      >Tools</a>
      <a
        href="/blog/"
        class:active={isBlogActive}
        aria-current={isBlogActive ? 'page' : undefined}
        data-sveltekit-preload-data="hover"
      >Blog</a>
      <a
        href="/about/"
        class:active={isAboutActive}
        aria-current={isAboutActive ? 'page' : undefined}
        data-sveltekit-preload-data="hover"
      >About</a>
      <span class="nav-item">
        <a
          href="/privacy.html"
          class:active={isPrivacyActive}
          aria-current={isPrivacyActive ? 'page' : undefined}
          data-sveltekit-reload
        >Privacy</a>
        <div class="nav-dropdown">
          <a href="/cookies.html" data-sveltekit-reload>Cookie settings</a>
          <a href="/privacy.html" data-sveltekit-reload>Privacy policy</a>
          <a href="/terms.html" data-sveltekit-reload>Terms of service</a>
        </div>
      </span>
      <button class="theme-toggle" onclick={toggleTheme} type="button" aria-label="Toggle theme" data-testid="theme-toggle">
        <span class="icon">{theme === 'dark' ? '☀' : '☾'}</span>
        <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
      </button>
    </nav>
  </div>
</header>

<main id="main">
  <slot />
</main>

<footer class="site-footer">
  <div class="container row between wrap" style="gap: 1rem;">
    <span>
      &copy; <span id="y">{currentYear}</span> TinyUtils
    </span>
    <span>
      <a href="/about/">About</a> &middot;
      <a href="https://buymeacoffee.com/tinyutils" target="_blank" rel="noopener">Support Us</a> &middot;
      <a href="/cookies.html">Cookie &amp; privacy settings</a> &middot;
      <a href="/privacy.html">Privacy</a> &middot;
      <a href="/terms.html">Terms</a>
    </span>
  </div>
</footer>

<style>
  :global(.nav-item) {
    position: relative;
    display: inline-block;
  }

  :global(.nav-dropdown) {
    display: none;
    position: absolute;
    top: 100%;
    right: 0;
    background: var(--glass-bg);
    backdrop-filter: blur(var(--glass-blur, 24px));
    -webkit-backdrop-filter: blur(var(--glass-blur, 24px));
    border: 1px solid var(--glass-border);
    border-radius: 12px;
    padding: var(--space-2);
    margin-top: var(--space-2);
    min-width: 180px;
    box-shadow: 0 8px 32px var(--glass-shadow);
    z-index: 1000;
  }

  :global(.nav-item:hover .nav-dropdown),
  :global(.nav-item:focus-within .nav-dropdown) {
    display: block;
  }

  :global(.nav-dropdown a) {
    display: block;
    padding: var(--space-2) var(--space-3);
    color: var(--text-secondary);
    text-decoration: none;
    border-radius: 8px;
    /* Only transition properties that change on hover */
    transition: background-color 0.2s ease, color 0.2s ease;
    font-size: 0.9rem;
  }

  :global(.nav-dropdown a:hover) {
    background: var(--glass-bg-hover);
    color: var(--text-primary);
  }
</style>
