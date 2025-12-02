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

  .field-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .field-label {
    font-weight: 500;
  }

  .input,
  .textarea {
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

  .tableWrap {
    max-height: 420px;
    overflow: auto;
  }

  .results-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
  }

  .results-table th,
  .results-table td {
    border-bottom: 1px solid var(--border-subtle);
    padding: var(--space-2) var(--space-3);
    text-align: left;
  }

  .results-table th {
    position: sticky;
    top: 0;
    background: var(--surface-base);
    z-index: 1;
  }

  .empty-cell {
    text-align: center;
    color: var(--text-muted);
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
    .options-grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
