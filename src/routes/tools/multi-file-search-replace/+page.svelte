<svelte:head>
  <title>Multi-file Search &amp; Replace — TinyUtils</title>
  <meta
    name="description"
    content="Bulk find and replace text or regex patterns across multiple files. Upload documents, preview diff-style changes, and download updated Markdown or plain text files."
  />
  <link rel="canonical" href="/tools/multi-file-search-replace/" />
</svelte:head>

<main id="main" class="container">
  <section class="tool-hero">
    <span class="tool-hero-icon" aria-hidden="true">🧭</span>
    <h1>Multi-file Search &amp; Replace</h1>
    <p class="tool-hero-subtitle">
      Bulk find and replace text or regex patterns across many documents with safe diff-style previews and a
      download-ready bundle.
    </p>
    <p class="tool-hero-note">
      This tool UI has not been fully migrated to the new SvelteKit experience yet. You can keep using the classic
      TinyUtils version while we finish the upgrade.
    </p>
  </section>

  <section class="tool-card">
    <h2>What this tool is for</h2>
    <p>
      Multi-file Search &amp; Replace is designed for batch text updates across many files at once. Typical workflows
      include fixing brand names, updating URLs, or cleaning up formatting quirks in a whole content library.
    </p>

    <ul class="tool-features-list">
      <li>Upload multiple text/Markdown documents in one go.</li>
      <li>Use plain text or regular expressions to search and replace.</li>
      <li>Preview changes in a diff-style view before downloading updated files.</li>
    </ul>

    <p class="tool-cta-help">
      The SvelteKit-powered version is coming soon. For now, this page exists so preview smokes and internal links
      resolve with a 200 status instead of a 404.
    </p>
  </section>
</main>

<style>
  .tool-hero {
    text-align: center;
    padding: var(--space-12, 3rem) 0 var(--space-8, 2rem);
    position: relative;
  }

  .tool-hero-icon {
    font-size: 3.5rem;
    display: block;
    margin-bottom: var(--space-4, 1rem);
  }

  .tool-hero h1 {
    font-size: var(--text-4xl, 2.5rem);
    margin-bottom: var(--space-3, 0.75rem);
  }

  .tool-hero-subtitle {
    max-width: 46rem;
    margin: 0 auto var(--space-3, 0.75rem);
    font-size: var(--text-lg, 1.05rem);
    color: var(--text-secondary);
  }

  .tool-hero-note {
    max-width: 40rem;
    margin: 0 auto;
    font-size: var(--text-sm);
    color: var(--text-tertiary);
  }

  .tool-card {
    margin: 0 auto var(--space-10, 2.5rem);
    max-width: 48rem;
    border-radius: var(--radius-2xl);
    border: 1px solid var(--border-default);
    padding: var(--space-6);
    background: var(--surface-base);
    box-shadow: var(--shadow-lg, 0 18px 45px rgba(15, 23, 42, 0.45));
  }

  .tool-card h2 {
    margin-top: 0;
    margin-bottom: var(--space-3);
  }

  .tool-card p {
    color: var(--text-secondary);
    margin-bottom: var(--space-3);
  }

  .tool-features-list {
    padding-left: 1.25rem;
    margin: 0 0 var(--space-3);
    color: var(--text-secondary);
  }

  .tool-features-list li {
    margin-bottom: 0.35rem;
  }

  .tool-cta-help {
    font-size: var(--text-sm);
    color: var(--text-tertiary);
  }

  @media (max-width: 768px) {
    .tool-card {
      padding: var(--space-4);
    }

    .tool-hero h1 {
      font-size: var(--text-2xl);
    }

    .tool-hero-subtitle {
      font-size: var(--text-base);
    }
  }
</style>

