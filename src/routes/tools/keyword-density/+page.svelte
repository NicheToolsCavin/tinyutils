<script>
  import { onMount } from 'svelte';

  let text = '';
  let topN = 20;
  let minLength = 3;
  let ignoreStopWords = true;
  let results = [];
  let isAnalyzed = false;

  const stopWords = new Set(
    'a,an,and,are,as,at,be,by,for,from,has,he,in,is,it,its,of,on,that,the,to,was,were,will,with,you,your,i,or,not,this,they,them,can,if,then,there,here,have,had,do,does,done,so,what,which,who,whom,about,into,over,under,also,just,up,down,out,how,when,where,why,may,might,one,two,three'.split(
      ','
    )
  );

  function tokenize(s) {
    return s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
  }

  function protectCsvCell(val) {
    const str = String(val ?? '');
    // Prevent CSV injection: prefix formula-like values with single quote
    if (/^[=+\-@]/.test(str)) return "'" + str;
    return str;
  }

  function resetAll() {
    text = '';
    topN = 20;
    minLength = 3;
    ignoreStopWords = true;
    results = [];
    isAnalyzed = false;
  }

  function analyzeKeywords() {
    const tokens = tokenize(text);
    const total = tokens.length || 1;
    const freq = new Map();

    for (const t of tokens) {
      if (t.length < minLength) continue;
      if (ignoreStopWords && stopWords.has(t)) continue;
      freq.set(t, (freq.get(t) || 0) + 1);
    }

    const rows = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, topN);

    results = rows.map(([term, count]) => ({
      term,
      count,
      density: parseFloat(((count / total) * 100).toFixed(2))
    }));

    isAnalyzed = true;
  }

  function handleKeydown(event) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      analyzeKeywords();
    }
  }

  async function copyCsv() {
    if (!results.length || typeof navigator === 'undefined' || !navigator.clipboard) return;

    const csvRows = ['term,count,density'];
    results.forEach((row) => {
      const term = protectCsvCell(row.term);
      const count = protectCsvCell(row.count);
      const density = protectCsvCell(row.density);
      csvRows.push(`${term},${count},${density}`);
    });

    const csv = csvRows.join('\n');

    try {
      await navigator.clipboard.writeText(csv);
      showToast('CSV copied to clipboard');
    } catch (err) {
      showToast('Copy failed: ' + (err?.message || 'Unknown error'));
    }
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
    const textArea = document.getElementById('text');
    if (textArea && 'focus' in textArea) {
      textArea.focus();
    }
  });
</script>

<svelte:window on:keydown={handleKeydown} />

<svelte:head>
  <title>Keyword Density — TinyUtils</title>
  <meta name="description" content="Analyze keyword frequency in your content for SEO optimization.">
  <meta name="robots" content="noindex" />
  <link rel="canonical" href="/tools/keyword-density/" />
</svelte:head>

<div class="tool-page">
  <section class="tool-hero">
    <span class="tool-hero-icon" aria-hidden="true">📊</span>
    <h1>Keyword Density</h1>
    <p class="tool-hero-subtitle">
      Analyze keyword frequency in your content and export results to CSV.
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
    <div class="field-group">
      <label for="text" class="field-label">Paste text</label>
      <textarea
        id="text"
        class="textarea"
        rows="8"
        placeholder="Paste content here"
        bind:value={text}
        data-testid="keyword-text-input"
      ></textarea>
    </div>

    <div class="options-grid">
      <div class="field-group">
        <label for="topN" class="field-label">Top N</label>
        <input
          id="topN"
          class="input"
          type="number"
          min="5"
          max="100"
          bind:value={topN}
        />
      </div>

      <div class="field-group">
        <label for="minLength" class="field-label">Min length</label>
        <input
          id="minLength"
          class="input"
          type="number"
          min="1"
          bind:value={minLength}
        />
      </div>

      <div class="checkbox-group">
        <label for="ignoreStopWords" class="checkbox">
          <input
            id="ignoreStopWords"
            type="checkbox"
            bind:checked={ignoreStopWords}
          />
          <span>Ignore stop words</span>
        </label>
      </div>
    </div>

    <div class="actions-row">
      <button
        class="btn primary"
        type="button"
        data-testid="keyword-analyze"
        on:click={analyzeKeywords}
        disabled={!text.trim()}
      >
        Analyze Density
      </button>
      <button class="btn ghost" type="button" on:click={copyCsv} disabled={!isAnalyzed}>
        Copy CSV
      </button>
      <button class="btn ghost" type="button" on:click={resetAll} disabled={!text && !isAnalyzed}>
        Clear
      </button>
      <div class="hint">
        <kbd>Ctrl/⌘</kbd> + <kbd>Enter</kbd> to analyze
      </div>
    </div>
  </section>

  {#if isAnalyzed}
    <section class="card">
      <h2>Results</h2>
      <div class="tableWrap">
        <table class="results-table" data-testid="keyword-results-table">
          <thead>
            <tr>
              <th>Term</th>
              <th>Count</th>
              <th>Density (%)</th>
            </tr>
          </thead>
          <tbody>
            {#if results.length === 0}
              <tr>
                <td colspan="3" class="empty-cell">
                  No results found. Try different text or adjust settings.
                </td>
              </tr>
            {:else}
              {#each results as row}
                <tr>
                  <td>{row.term}</td>
                  <td>{row.count}</td>
                  <td>{row.density}%</td>
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
      </div>
    </section>
  {/if}
</div>

<style>
  /* ═══════════════════════════════════════════════════════════
     LIQUID GLASS KEYWORD DENSITY
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
  .textarea {
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
  .textarea:focus {
    outline: none;
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
  }

  :global(html[data-theme="light"]) .input,
  :global(html[data-theme="light"]) .textarea {
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

  /* Glass table */
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

  .results-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
  }

  .results-table th,
  .results-table td {
    border-bottom: 1px solid var(--glass-border);
    padding: var(--space-2) var(--space-3);
    text-align: left;
    color: var(--text-secondary);
  }

  .results-table th {
    position: sticky;
    top: 0;
    background: var(--glass-bg-hover);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    color: var(--text-primary);
    font-weight: var(--font-semibold);
    z-index: 1;
  }

  :global(html[data-theme="light"]) .results-table th {
    background: rgba(255, 255, 255, 0.8);
  }

  .results-table tbody tr:hover {
    background: var(--glass-bg-hover);
  }

  .empty-cell {
    text-align: center;
    color: var(--text-tertiary);
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
    .options-grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
