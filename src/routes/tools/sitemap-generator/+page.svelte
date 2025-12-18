<script>
  import { onMount } from 'svelte';

  let baseUrl = '';
  let paths = '';
  let changefreq = 'weekly';
  let priority = 0.5;
  let includeLastmod = true;
  let xmlOutput = '';
  let isGenerated = false;

  function normalize(base, line) {
    line = line.trim();
    if (!line) return null;
    try {
      if (/^https?:\/\//i.test(line)) return new URL(line).href;
      if (base) return new URL(line, base).href;
    } catch (e) {}
    return line;
  }

  function xmlEscape(s) {
    return s.replace(/[<>&"']/g, (c) => ({
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;',
      '"': '&quot;',
      "'": '&apos;'
    })[c]);
  }

  function resetForm() {
    baseUrl = '';
    paths = '';
    changefreq = 'weekly';
    priority = 0.5;
    includeLastmod = true;
    xmlOutput = '';
    isGenerated = false;
  }

  function generateSitemap() {
    const prio = Math.min(1, Math.max(0, priority || 0.5));
    const lm = includeLastmod ? new Date().toISOString().slice(0, 10) : null;
    const raw = paths.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    const urls = [];
    const seen = new Set();
    const duplicatesRemoved = [];

    for (const line of raw) {
      const u = normalize(baseUrl, line);
      if (u) {
        if (seen.has(u)) {
          duplicatesRemoved.push(u);
        } else {
          seen.add(u);
          urls.push(u);
        }
      }
    }

    if (urls.length === 0) {
      showToast('Please add at least one URL or path.');
      return;
    }

    const lines = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    ];

    for (const u of urls) {
      lines.push('  <url>');
      lines.push('    <loc>' + xmlEscape(u) + '</loc>');
      if (lm) lines.push('    <lastmod>' + lm + '</lastmod>');
      lines.push('    <changefreq>' + changefreq + '</changefreq>');
      lines.push('    <priority>' + prio.toFixed(1) + '</priority>');
      lines.push('  </url>');
    }

    lines.push('</urlset>');
    xmlOutput = lines.join('\n');
    isGenerated = true;

    // Show success message with stats
    const dupMsg = duplicatesRemoved.length > 0 ? ` (${duplicatesRemoved.length} duplicates removed)` : '';
    showToast(`Generated sitemap with ${urls.length} URL${urls.length !== 1 ? 's' : ''}${dupMsg}`);
  }

  function handleKeydown(event) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      generateSitemap();
    }
  }

  async function copyToClipboard() {
    if (!xmlOutput || typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(xmlOutput);
      showToast('Copied to clipboard');
    } catch (err) {
      showToast('Copy failed: ' + (err?.message || 'Unknown error'));
    }
  }

  function downloadSitemap() {
    if (!xmlOutput) return;
    const blob = new Blob([xmlOutput], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sitemap.xml';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      try {
        document.body.removeChild(a);
      } catch (e) {}
      try {
        URL.revokeObjectURL(url);
      } catch (e) {}
    }, 0);
  }

  function showToast(message) {
    if (typeof document === 'undefined') return;
    const existing = document.querySelector('.toast');
    if (existing && existing.parentElement) existing.parentElement.removeChild(existing);

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);

    setTimeout(() => {
      if (toast.parentElement) toast.parentElement.removeChild(toast);
    }, 3000);
  }

  onMount(() => {
    if (typeof document === 'undefined') return;
    const baseInput = document.getElementById('baseUrl');
    if (baseInput && 'focus' in baseInput) {
      baseInput.focus();
    }
  });
</script>

<svelte:window on:keydown={handleKeydown} />

<svelte:head>
  <title>Sitemap Generator — TinyUtils</title>
  <meta name="description" content="Generate XML sitemaps from URL lists for search engine crawling.">
  <meta name="robots" content="noindex" />
  <link rel="canonical" href="/tools/sitemap-generator/" />
</svelte:head>

<div class="tool-page">
  <section class="tool-hero">
    <span class="tool-hero-icon" aria-hidden="true">🗺️</span>
    <h1 data-testid="sitemap-generator-heading">Sitemap Generator</h1>
    <p class="tool-hero-subtitle">
      Generate XML sitemaps for your website with customizable options.
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

  <section class="card">
    <div class="tool-grid">
      <div class="field-group">
        <label for="baseUrl" class="field-label">Base site (optional)</label>
        <input
          id="baseUrl"
          class="input"
          type="url"
          placeholder="https://example.com"
          bind:value={baseUrl}
          data-testid="sitemap-generator-base-url"
        />
      </div>

      <div class="field-group">
        <label for="paths" class="field-label">URLs or paths (one per line)</label>
        <textarea
          id="paths"
          class="textarea"
          rows="8"
          placeholder="/&#10;/about&#10;/blog/post-1 or full URLs"
          bind:value={paths}
          data-testid="sitemap-generator-paths"
        ></textarea>
      </div>
    </div>

    <div class="options-grid">
      <div class="field-group">
        <label for="changefreq" class="field-label">Default changefreq</label>
        <select
          id="changefreq"
          class="input"
          bind:value={changefreq}
        >
          <option value="weekly">weekly</option>
          <option value="daily">daily</option>
          <option value="monthly">monthly</option>
          <option value="yearly">yearly</option>
          <option value="never">never</option>
        </select>
      </div>

      <div class="field-group">
        <label for="priority" class="field-label">Default priority</label>
        <input
          id="priority"
          class="input"
          type="number"
          min="0"
          max="1"
          step="0.1"
          bind:value={priority}
        />
      </div>

      <div class="checkbox-group">
        <label for="includeLastmod" class="checkbox">
          <input
            id="includeLastmod"
            type="checkbox"
            bind:checked={includeLastmod}
          />
          <span>Include <code>lastmod</code> (today)</span>
        </label>
      </div>
    </div>

    <div class="actions-row">
      <button
        class="btn primary"
        type="button"
        data-testid="sitemap-generator-build"
        on:click={generateSitemap}
      >
        Build sitemap.xml
      </button>
      <button
        class="btn secondary"
        type="button"
        on:click={downloadSitemap}
        disabled={!isGenerated}
      >
        Download
      </button>
      <button
        class="btn ghost"
        type="button"
        on:click={copyToClipboard}
        disabled={!isGenerated}
      >
        Copy
      </button>
      <button
        class="btn ghost"
        type="button"
        on:click={resetForm}
        disabled={!paths && !baseUrl && !isGenerated}
      >
        Clear
      </button>
      <div class="hint">
        <kbd>Ctrl/⌘</kbd> + <kbd>Enter</kbd> to generate
      </div>
    </div>
  </section>

  {#if isGenerated}
    <section class="card">
      <h2>Generated Sitemap</h2>
      <div class="tableWrap">
        <pre id="output" class="xml-output">{xmlOutput}</pre>
      </div>
    </section>
  {/if}
</div>

<style>
  /* ═══════════════════════════════════════════════════════════
     LIQUID GLASS SITEMAP GENERATOR
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
  }

  .tool-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(0, 1.4fr);
    gap: var(--space-6);
    position: relative;
    z-index: 1;
  }

  .field-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    position: relative;
    z-index: 1;
  }

  .field-label {
    font-weight: var(--font-medium);
    color: var(--text-primary);
  }

  /* Glass inputs */
  .input,
  .textarea,
  select.input {
    width: 100%;
    border-radius: var(--radius-lg);
    border: 1px solid var(--glass-border);
    background: var(--glass-bg);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    padding: var(--space-2_5) var(--space-3);
    color: var(--text-primary);
    transition: all 0.2s ease;
  }

  .input:focus,
  .textarea:focus,
  select.input:focus {
    outline: none;
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
  }

  :global(html[data-theme="light"]) .input,
  :global(html[data-theme="light"]) .textarea,
  :global(html[data-theme="light"]) select.input {
    background: rgba(255, 255, 255, 0.6);
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.06);
  }

  .textarea {
    min-height: 8rem;
    resize: vertical;
  }

  .options-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: var(--space-4);
    margin-top: var(--space-6);
    position: relative;
    z-index: 1;
  }

  .checkbox-group {
    display: flex;
    align-items: center;
  }

  .checkbox {
    display: inline-flex;
    gap: var(--space-2);
    align-items: center;
    font-size: 0.9rem;
    color: var(--text-secondary);
  }

  .checkbox code {
    font-family: var(--font-mono);
    font-size: 0.8rem;
    padding: 1px 4px;
    border-radius: 3px;
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
  }

  .actions-row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    align-items: center;
    margin-top: var(--space-4);
    position: relative;
    z-index: 1;
  }

  .hint {
    font-size: 0.85rem;
    color: var(--text-tertiary);
  }

  .hint kbd {
    font-family: var(--font-mono);
    font-size: 0.78rem;
    border-radius: 4px;
    border: 1px solid var(--glass-border);
    padding: 1px 5px;
    background: var(--glass-bg);
  }

  /* Glass XML output */
  .tableWrap {
    max-height: 420px;
    overflow: auto;
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-xl);
    background: var(--glass-bg);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    position: relative;
    z-index: 1;
  }

  :global(html[data-theme="light"]) .tableWrap {
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06),
                inset 0 1px 0 rgba(255, 255, 255, 0.8);
  }

  .xml-output {
    font-family: var(--font-mono);
    font-size: 0.85rem;
    white-space: pre;
    padding: var(--space-3);
    color: var(--text-secondary);
  }

  /* Glass toast */
  :global(.toast) {
    position: fixed;
    left: 50%;
    bottom: var(--space-6);
    transform: translateX(-50%);
    background: var(--glass-bg);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    color: var(--text-primary);
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-full);
    border: 1px solid var(--accent-primary);
    box-shadow: 0 12px 40px var(--glass-shadow),
                0 0 20px rgba(59, 130, 246, 0.2);
    z-index: 9999;
  }

  :global(html[data-theme="light"] .toast) {
    background: rgba(255, 255, 255, 0.9);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15),
                inset 0 1px 0 rgba(255, 255, 255, 0.9);
  }

  @media (max-width: 768px) {
    .tool-grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
