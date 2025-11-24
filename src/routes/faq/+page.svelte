<svelte:head>
  <title>Frequently Asked Questions – TinyUtils</title>
  <meta
    name="description"
    content="Get answers to common questions about TinyUtils tools including Dead Link Finder, Sitemap Delta, Wayback Fixer, and Document Converter."
  />
  <link rel="canonical" href="/faq/" />
  <meta property="og:title" content="Frequently Asked Questions – TinyUtils" />
  <meta property="og:description" content="Common questions about TinyUtils tools and features." />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="/og.png" />
  <meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<div class="page">
  <section class="container faq-hero">
    <h1>Frequently Asked Questions</h1>
    <p class="sub">Everything you need to know about using TinyUtils tools</p>
  </section>

  <section class="container card faq-content">
    <div class="placeholder-notice">
      <h2>FAQ Content Coming Soon</h2>
      <p>
        This comprehensive FAQ page is being populated with cross-tool questions organized by category:
      </p>
      <ul style="text-align: left; max-width: 500px; margin: var(--space-4) auto;">
        <li>General questions (pricing, privacy, browser support)</li>
        <li>Document Converter FAQs</li>
        <li>Dead Link Finder FAQs</li>
        <li>Sitemap Delta FAQs</li>
        <li>Wayback Fixer FAQs</li>
      </ul>
    </div>

    <section class="faq-section">
      <h2>General</h2>

      <div class="faq-item">
        <h3>Are TinyUtils tools free to use?</h3>
        <p>
          Yes, all TinyUtils tools are free to use with no registration required. We're supported by optional
          privacy-respecting ads.
        </p>
      </div>

      <div class="faq-item">
        <h3>Do you store my files or data?</h3>
        <p>
          No. Files uploaded to our converter are automatically deleted after conversion. URL checks and sitemap
          comparisons don't store your data. All processing is temporary and secure.
        </p>
      </div>

      <div class="faq-item">
        <h3>What browsers are supported?</h3>
        <p>
          TinyUtils works on all modern browsers including Chrome, Firefox, Safari, Edge, and mobile browsers. No
          installation or plugins required.
        </p>
      </div>
    </section>

    <section class="faq-section">
      <h2>Document Converter</h2>

      <div class="faq-item">
        <h3>What file formats do you support?</h3>
        <p>
          We support 100+ formats including PDF, DOCX, HTML, Markdown, ODT, EPUB, RTF, LaTeX, and more. View the
          <a href="/tools/formats/">complete list of supported formats</a>.
        </p>
      </div>

      <div class="faq-item">
        <h3>Is there a file size limit?</h3>
        <p>Content coming soon.</p>
      </div>
    </section>

    <section class="faq-section">
      <h2>Dead Link Finder</h2>

      <div class="faq-item">
        <h3>How does the broken link checker work?</h3>
        <p>
          Enter your webpage URL and our tool crawls all links on that page, checking each one for HTTP status codes
          (200, 404, etc.), redirects, and errors.
        </p>
      </div>

      <div class="faq-item">
        <h3>Can I check multiple pages at once?</h3>
        <p>Content coming soon.</p>
      </div>
    </section>

    <section class="faq-section">
      <h2>Sitemap Delta</h2>

      <div class="faq-item">
        <h3>How do I use Sitemap Delta for migrations?</h3>
        <p>
          Compare your old and new sitemaps to see which URLs changed. The tool automatically suggests 301 redirects
          and generates nginx/Apache config files.
        </p>
      </div>
    </section>

    <section class="faq-section">
      <h2>Wayback Fixer</h2>

      <div class="faq-item">
        <h3>How do I recover deleted webpages?</h3>
        <p>
          Paste your dead URLs into Wayback Fixer and it will search the Internet Archive for archived snapshots. You
          can then download or link to those archived versions.
        </p>
      </div>
    </section>

    <section
      style="margin-top: var(--space-10); padding-top: var(--space-8); border-top: 1px solid var(--border-default);"
    >
      <h2 style="font-size: var(--text-xl); margin-bottom: var(--space-4);">Still have questions?</h2>
      <p style="color: var(--text-secondary); margin-bottom: var(--space-4);">
        Check our individual tool pages for more specific FAQs:
      </p>
      <div style="display: flex; gap: var(--space-3); flex-wrap: wrap;">
        <a href="/tools/dead-link-finder/" class="btn">Dead Link Finder</a>
        <a href="/tools/sitemap-delta/" class="btn">Sitemap Delta</a>
        <a href="/tools/wayback-fixer/" class="btn">Wayback Fixer</a>
      </div>
    </section>
  </section>
</div>

<style>
  .faq-hero {
    text-align: center;
    padding: var(--space-14) var(--space-4) var(--space-6);
  }

  .faq-hero h1 {
    font-size: var(--text-4xl);
    font-weight: var(--font-bold);
    background: var(--gradient-brand);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: var(--space-3);
  }

  .faq-hero .sub {
    color: var(--text-secondary);
    font-size: var(--text-lg);
  }

  .faq-content {
    padding: var(--space-8);
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  .placeholder-notice {
    background: var(--surface-elevated);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-xl);
    padding: var(--space-6);
    text-align: center;
  }

  .faq-section h2 {
    font-size: var(--text-2xl);
    margin-bottom: var(--space-3);
  }

  .faq-item {
    margin-bottom: var(--space-4);
  }

  .faq-item h3 {
    font-size: var(--text-lg);
    margin-bottom: var(--space-2);
  }

  .faq-item p {
    color: var(--text-secondary);
    line-height: 1.7;
  }
</style>
