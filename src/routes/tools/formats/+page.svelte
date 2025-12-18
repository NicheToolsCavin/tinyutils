<script>
  // Formats page is static, no client-side behavior needed
</script>

<svelte:head>
  <title>Supported Formats — TinyUtils</title>
  <meta name="description" content="Supported input and output formats for the TinyUtils Document Converter.">
  <link rel="canonical" href="/tools/formats/" />
</svelte:head>

<div class="tool-page">
  <section class="tool-hero" data-testid="formats-hero">
    <span class="tool-hero-icon" aria-hidden="true">📄</span>
    <h1>Supported Formats</h1>
    <p class="tool-hero-subtitle">
      Our Document Converter can handle over 100 formats. Below are the most commonly used ones. If you
      need a format not listed here, contact us — we likely support it or can add it quickly.
    </p>
    <p><a class="cta" href="/tools/">← Back to all tools</a></p>
  </section>

  <section class="container ad-slot" aria-label="Sponsored">
    <ins
      class="adsbygoogle"
      style="display:block"
      data-ad-client="ca-pub-3079281180008443"
      data-ad-slot="3664281983"
      data-ad-format="auto"
      data-full-width-responsive="true"
    ></ins>
    <svelte:element this={'script'}>
      {`
        try { (adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
      `}
    </svelte:element>
  </section>

  <section class="formats-layout container">
    <div class="formats-grid">
      <section class="card" aria-labelledby="inputsHeading" data-testid="formats-inputs-section">
        <h2 id="inputsHeading">Inputs</h2>
        <ul class="formats-list">
          <li><strong>Markdown:</strong> .md, .markdown</li>
          <li><strong>Plain Text:</strong> .txt</li>
          <li><strong>HTML:</strong> .html, .htm</li>
          <li><strong>LaTeX:</strong> .tex</li>
          <li><strong>Word:</strong> .docx</li>
          <li><strong>OpenDocument:</strong> .odt</li>
          <li><strong>Rich Text:</strong> .rtf</li>
          <li><strong>PDF:</strong> .pdf (best with text-based PDFs)</li>
          <li><strong>EPUB/ZIP bundles:</strong> .epub, .zip</li>
        </ul>
      </section>

      <section class="card" aria-labelledby="outputsHeading" data-testid="formats-outputs-section">
        <h2 id="outputsHeading">Outputs</h2>
        <ul class="formats-list">
          <li><strong>Markdown:</strong> .md (multiple dialects available)</li>
          <li><strong>Plain Text:</strong> .txt</li>
          <li><strong>HTML:</strong> .html</li>
          <li><strong>Word:</strong> .docx</li>
          <li><strong>OpenDocument:</strong> .odt</li>
          <li><strong>PDF:</strong> .pdf</li>
          <li><strong>Rich Text:</strong> .rtf</li>
        </ul>
      </section>
    </div>

    <p class="help">
      Tip: For large or unusual documents, try one format at a time first, then add more via the advanced
      toggle in the converter.
    </p>

    <div class="actions-row" data-testid="formats-actions-row">
      <a class="btn secondary" href="/tools/">← Back to Tools</a>
      <a class="btn primary" href="/tools/text-converter/" data-testid="formats-open-converter">Open Converter</a>
    </div>
  </section>
</div>

<style>
  /* ═══════════════════════════════════════════════════════════
     LIQUID GLASS FORMATS PAGE
     ═══════════════════════════════════════════════════════════ */

  .tool-page {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
    padding-bottom: var(--space-10);
  }

  .tool-hero {
    text-align: center;
    padding: var(--space-12) 0 var(--space-8);
  }

  .tool-hero-icon {
    font-size: 3.5rem;
    display: block;
    margin-bottom: var(--space-4);
  }

  .tool-hero h1 {
    font-size: clamp(2rem, 5vw, 3rem);
    font-weight: var(--font-bold);
    background: var(--accent-gradient);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: var(--space-3);
    letter-spacing: -0.02em;
  }

  .tool-hero-subtitle {
    max-width: 720px;
    margin: 0 auto;
    color: var(--text-secondary);
    font-size: 0.98rem;
  }

  .formats-layout {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  .formats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: var(--space-6);
  }

  /* Glass card */
  .card {
    position: relative;
    border-radius: var(--radius-2xl);
    border: 1px solid var(--glass-border);
    background: var(--glass-bg);
    backdrop-filter: blur(var(--glass-blur));
    -webkit-backdrop-filter: blur(var(--glass-blur));
    padding: var(--space-6);
    overflow: hidden;
    transition: all 0.3s ease;
  }

  .card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--glass-highlight), transparent);
    opacity: 0.6;
  }

  .card::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 40%;
    background: var(--glass-shine);
    pointer-events: none;
    opacity: 0.3;
  }

  .card:hover {
    border-color: var(--accent-primary);
    box-shadow: 0 12px 40px var(--glass-shadow);
  }

  :global(html[data-theme="light"]) .card {
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06),
                inset 0 1px 0 rgba(255, 255, 255, 0.9);
  }

  :global(html[data-theme="light"]) .card::after {
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.7) 0%, transparent 100%);
    opacity: 1;
  }

  .card h2 {
    position: relative;
    z-index: 1;
    color: var(--text-primary);
    font-weight: var(--font-semibold);
    margin-bottom: var(--space-4);
  }

  .formats-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    position: relative;
    z-index: 1;
  }

  .formats-list li {
    padding: var(--space-2) 0;
    border-bottom: 1px solid var(--glass-border);
    color: var(--text-secondary);
    font-size: 0.95rem;
  }

  .formats-list li:last-child {
    border-bottom: none;
  }

  .formats-list li strong {
    color: var(--text-primary);
    font-weight: var(--font-semibold);
  }

  .help {
    color: var(--text-tertiary);
    margin: var(--space-4) 0;
    font-size: 0.9rem;
  }

  .actions-row {
    display: flex;
    gap: var(--space-3);
    flex-wrap: wrap;
  }
</style>
