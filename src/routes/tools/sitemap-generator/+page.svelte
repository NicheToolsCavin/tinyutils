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
    <h1>Sitemap Generator</h1>
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
      <button class="btn primary" type="button" on:click={generateSitemap}>
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
  .tool-page {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  .tool-hero {
    text-align: center;
    padding: var(--space-10) 0 var(--space-6);
  }

  .tool-hero-icon {
    font-size: 3rem;
    display: block;
    margin-bottom: var(--space-3);
  }

  .tool-hero-subtitle {
    max-width: 720px;
    margin: 0 auto;
    color: var(--text-secondary);
  }

  .card {
    border-radius: var(--radius-xl);
    border: 1px solid var(--border-default);
    background: var(--surface-base);
    padding: var(--space-6);
    box-shadow: var(--shadow-sm);
  }

  .tool-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(0, 1.4fr);
    gap: var(--space-6);
  }

  .field-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .field-label {
    font-weight: 500;
  }

  .input,
  .textarea,
  select.input {
    width: 100%;
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-default);
    padding: var(--space-2_5) var(--space-3);
    background: var(--surface-input);
    color: var(--text-primary);
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
  }

  .actions-row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    align-items: center;
    margin-top: var(--space-4);
  }

  .hint {
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .xml-output {
    font-family: var(--font-mono);
    font-size: 0.85rem;
    white-space: pre;
    padding: var(--space-3);
  }

  .tableWrap {
    max-height: 420px;
    overflow: auto;
  }

  :global(.toast) {
    position: fixed;
    left: 50%;
    bottom: var(--space-6);
    transform: translateX(-50%);
    background: var(--surface-elevated);
    color: var(--text-primary);
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-full);
    border: 1px solid var(--border-default);
    box-shadow: var(--shadow-md);
    z-index: 9999;
  }

  @media (max-width: 768px) {
    .tool-grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
