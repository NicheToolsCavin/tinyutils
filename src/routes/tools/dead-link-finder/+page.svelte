<script lang="ts">
  import {
    buildDlfPayload,
    statusGroup,
    buildCsv,
    summarizeRows,
    makeDatedFilename
  } from '$lib/tools/dead-link-finder/utils.js';

  type DlfRow = {
    url: string;
    status?: number | null;
    ok?: boolean;
    finalUrl?: string | null;
    archive?: { url?: string | null } | null;
    note?: string | null;
    chain?: number | null;
  };

  type DlfMeta = {
    truncated?: boolean;
    totalQueued?: number;
    totalChecked?: number;
    robotsStatus?: string;
    robotsReason?: string | null;
    requestId?: string;
    mode?: string;
    source?: string;
    [key: string]: unknown;
  };

  let pageUrl = '';
  let urlsList = '';
  let scope: 'internal' | 'all' = 'internal';
  let includeAssets = false;
  let respectRobots = true;
  let headFirst = true;
  let retryHttp = false;
  let includeArchive = false;
  let timeout = 10000;
  let concurrency = 10;

  const DEMO_TARGETS = [
    'https://example.com/',
    'https://example.com/blog/old-article',
    'https://example.com/docs/broken-image.png',
    'https://example.com/missing',
    'https://example.com/404'
  ].join('\n');

  let isRunning = false;
  let progressMessage = 'Ready.';
  let progressValue = 0;

  let rows: DlfRow[] = [];
  let meta: DlfMeta | null = null;
  let lastRequestPayload: any = null;

  let errorMessage: string | null = null;

  let toast: string | null = null;
  const TOAST_DURATION = 4000;
  let toastTimeout: ReturnType<typeof setTimeout> | null = null;

  let search = '';
  let onlyBroken = false;

  let statusFilters: Record<string, boolean> = {
    '2': true,
    '3': true,
    '4': true,
    '5': true,
    null: true
  };

  function showToast(message: string) {
    toast = message;
    if (toastTimeout) {
      clearTimeout(toastTimeout);
    }
    toastTimeout = setTimeout(() => {
      toast = null;
      toastTimeout = null;
    }, TOAST_DURATION);
  }

  function rowMatchesFilters(row: DlfRow): boolean {
    const group = statusGroup(row.status as any);
    if (!statusFilters[group]) return false;
    if (onlyBroken && row.ok) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const haystack =
        (row.url || '') +
        ' ' +
        (row.finalUrl || '') +
        ' ' +
        (row.note || '');
      if (!haystack.toLowerCase().includes(q)) return false;
    }
    return true;
  }

  $: filteredRows = rows.filter((row) => rowMatchesFilters(row));
  $: summaryLine = summarizeRows(rows as any, meta as any);

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      runCheck();
    }
  }

  async function runCheck() {
    errorMessage = null;
    isRunning = true;
    progressMessage = 'Preparing request…';
    progressValue = 10;
    rows = [];
    meta = null;

    let payload;
    try {
      payload = buildDlfPayload({
        pageUrl,
        urlsList,
        respectRobots,
        scope,
        includeAssets,
        headFirst,
        retryHttp,
        includeArchive,
        timeout,
        concurrency
      });
    } catch (error) {
      isRunning = false;
      progressMessage = 'Ready.';
      progressValue = 0;
      errorMessage = (error as Error).message ?? String(error);
      showToast(errorMessage);
      return;
    }

    lastRequestPayload = payload;

    try {
      progressMessage = 'Running…';
      progressValue = 30;

      const res = await fetch('/api/check', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(
          `API error: ${res.status} ${res.statusText}${text ? ` – ${text}` : ''}`
        );
      }

      const data = await res.json();

      if (!data || data.ok === false) {
        const message =
          data?.error?.message || data?.message || 'Dead Link Finder request failed.';
        throw new Error(message);
      }

      rows = Array.isArray(data.rows) ? data.rows : [];
      meta = (data.meta || null) as DlfMeta;

      progressMessage = 'Done.';
      progressValue = 100;

      if (rows.length === 0) {
        showToast('No links were returned. Check robots, scope, or source URL.');
      }
    } catch (error) {
      errorMessage = (error as Error).message ?? String(error);
      progressMessage = 'Error.';
      progressValue = 0;
      showToast(errorMessage);
    } finally {
      isRunning = false;
    }
  }

  function clearAll() {
    pageUrl = '';
    urlsList = '';
    rows = [];
    meta = null;
    lastRequestPayload = null;
    progressMessage = 'Ready.';
    progressValue = 0;
    errorMessage = null;
  }

  function loadDemo() {
    pageUrl = 'https://example.com/legacy';
    urlsList = DEMO_TARGETS;
    scope = 'all';
    includeAssets = true;
    respectRobots = true;
    timeout = 12000;
    concurrency = 6;
    showToast('Example inputs loaded — press Run to simulate a crawl.');
    progressMessage = 'Example inputs loaded — press Run.';
    progressValue = 0;
  }

  async function exportCsv() {
    if (!rows.length) return;
    const csv = buildCsv(rows as any, meta as any);
    const filename = makeDatedFilename('dead-link-finder', 'csv');
    downloadFile(filename, 'text/csv;charset=utf-8', csv);
  }

  async function exportJson() {
    if (!rows.length) return;

    const settings: Record<string, any> = {
      scope,
      respectRobots,
      includeAssets,
      includeArchive,
      headFirst,
      retryHttp,
      timeout,
      concurrency
    };

    const payload = {
      ok: true,
      meta: {
        tool: 'dead-link-finder',
        timestampISO: new Date().toISOString(),
        settings,
        run: meta
      },
      rows
    };

    const filename = makeDatedFilename('dead-link-finder', 'json');
    downloadFile(
      filename,
      'application/json;charset=utf-8',
      JSON.stringify(payload, null, 2)
    );
  }

  async function copyCsv() {
    if (!rows.length || typeof navigator === 'undefined' || !navigator.clipboard) return;
    const csv = buildCsv(rows as any, meta as any);
    try {
      await navigator.clipboard.writeText(csv);
      showToast('CSV copied to clipboard');
    } catch (error) {
      showToast('Copy failed: ' + ((error as Error).message || 'Unknown error'));
    }
  }

  async function copySummary() {
    if (!summaryLine || typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(summaryLine);
      showToast('Status line copied');
    } catch (error) {
      showToast('Copy failed: ' + ((error as Error).message || 'Unknown error'));
    }
  }

  async function shareResults() {
    if (typeof navigator === 'undefined' || typeof window === 'undefined') return;
    const canShare = 'share' in navigator && typeof (navigator as any).share === 'function';
    if (!canShare) {
      showToast('Share is not supported on this device.');
      return;
    }

    try {
      await (navigator as any).share({
        title: 'Dead Link Finder results',
        text: summaryLine,
        url: window.location.href
      });
    } catch {
      // User cancelled share; no-op.
    }
  }

  function downloadFile(filename: string, mimeType: string, content: string) {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<svelte:head>
  <title>Dead Link Finder — TinyUtils</title>
  <meta
    name="description"
    content="Scan a page, list, or sitemap for broken links. Robots-aware, HSTS-safe, with CSV/JSON exports. Powered by TinyUtils."
  />
  <link rel="canonical" href="/tools/dead-link-finder/" />
</svelte:head>

<section class="tool-hero">
  <div class="container">
    <span class="tool-hero-icon" aria-hidden="true">🔍</span>
    <h1>Dead Link Finder</h1>
    <p class="tool-hero-subtitle">
      Scan a page or list of URLs for broken links before your users find them.
    </p>
    <p class="tool-hero-meta">
      Robots-aware · HSTS guard · CSV/JSON export · Wayback hints
    </p>
    <p><a class="cta" href="/tools/">← Back to all tools</a></p>
  </div>
</section>

<section class="ad-slot container" aria-label="Sponsored">
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

<section class="tool-layout container">
  <section class="card" aria-labelledby="dlf-input-heading">
    <header class="card-header">
      <h2 id="dlf-input-heading">Inputs</h2>
      <p class="card-subtitle">
        Start with a single page URL, or open Advanced mode to paste a list of URLs (up to
        200).
      </p>
    </header>

    <form
      class="tool-form"
      on:submit|preventDefault={runCheck}
    >
      <div class="field-group">
        <label for="pageUrl" class="field-label">Page URL</label>
        <input
          id="pageUrl"
          class="field-input"
          type="url"
          placeholder="https://example.com/page"
          bind:value={pageUrl}
        />
        <p class="field-help">
          We&apos;ll crawl this page and check each link it contains.
        </p>
      </div>

      <details class="advanced">
        <summary>Advanced: paste a list of URLs</summary>
        <div class="advanced-content">
          <label for="targetsInput" class="field-label">URL list (one per line)</label>
          <textarea
            id="targetsInput"
            class="field-input mono"
            rows="6"
            placeholder="https://example.com/old-page&#10;https://example.com/missing"
            bind:value={urlsList}
          ></textarea>
          <p class="field-help">
            When this list is non‑empty we&apos;ll skip crawling and check these URLs
            directly (up to 200).
          </p>
        </div>
      </details>

      <div class="options-grid">
        <div class="options-column">
          <label for="scope" class="field-label">Scope</label>
          <select id="scope" class="field-input" bind:value={scope}>
            <option value="internal">Internal only (same site)</option>
            <option value="all">All links on page</option>
          </select>

          <div class="checkbox-group">
            <label>
              <input id="includeAssets" type="checkbox" bind:checked={includeAssets} />
              Include assets (images, scripts, styles)
            </label>
            <label>
              <input id="respectRobots" type="checkbox" bind:checked={respectRobots} />
              Respect robots.txt for page crawl
            </label>
          </div>
        </div>

        <div class="options-column">
          <p class="field-label">HTTP behaviour</p>
          <div class="checkbox-group">
            <label>
              <input id="headFirst" type="checkbox" bind:checked={headFirst} />
              Try HEAD before GET
            </label>
            <label>
              <input id="retryHttp" type="checkbox" bind:checked={retryHttp} />
              Retry over HTTP if HTTPS fails (safe hosts only)
            </label>
            <label>
              <input id="includeArchive" type="checkbox" bind:checked={includeArchive} />
              Include Wayback helper (if available)
            </label>
          </div>
        </div>

        <div class="options-column">
          <p class="field-label">Politeness</p>
          <div class="field-row">
            <label for="timeout">Timeout per request (ms)</label>
            <input
              id="timeout"
              type="number"
              min="1000"
              max="30000"
              step="500"
              class="field-input"
              bind:value={timeout}
            />
          </div>
          <div class="field-row">
            <label for="concurrency">Max concurrency</label>
            <input
              id="concurrency"
              type="number"
              min="1"
              max="10"
              step="1"
              class="field-input"
              bind:value={concurrency}
            />
          </div>
          <p class="field-help">
            Caps keep the tool polite to origin servers.
          </p>
        </div>
      </div>

      <div class="actions-row">
        <button
          id="runBtn"
          class="btn primary"
          type="submit"
          disabled={isRunning}
        >
          {isRunning ? 'Running…' : 'Run check'}
        </button>
        <button
          id="clearBtn"
          class="btn secondary"
          type="button"
          on:click={clearAll}
        >
          Clear
        </button>
        <button
          id="demoBtn"
          class="btn secondary"
          type="button"
          on:click={loadDemo}
        >
          Try example
        </button>
        <span class="badge">
          Shortcuts: <kbd>Ctrl</kbd>/<kbd>Cmd</kbd> + <kbd>Enter</kbd> to run
        </span>
      </div>

      <div
        id="progress"
        class="progress-banner"
        aria-live="polite"
        role="status"
      >
        <span id="progressMessage" class="progress-text">{progressMessage}</span>
        <progress
          id="progressMeter"
          max="100"
          value={progressValue}
          hidden={!isRunning && progressValue === 0}
        ></progress>
      </div>
    </form>
  </section>

  <section class="card" aria-labelledby="resultsHeading">
    <header class="card-header card-header-results">
      <div>
        <h2 id="resultsHeading" tabindex="-1">Results</h2>
        <p id="summary" class="summary-text">{summaryLine}</p>
        <p id="metaLine" class="meta-line">
          {#if meta}
            {#if meta.totalChecked != null}
              Checked {meta.totalChecked} of {meta.totalQueued ?? meta.totalChecked} URLs.
            {/if}
            {#if meta.truncated}
              Truncated to stay polite.
            {/if}
          {:else}
            Paste a URL and run a check to see results here.
          {/if}
        </p>
      </div>

      <div class="results-actions">
        <button
          id="copyStatus"
          class="btn ghost small"
          type="button"
          on:click={copySummary}
        >
          Copy status line
        </button>
        <button
          id="copyCsv"
          class="btn ghost small"
          type="button"
          on:click={copyCsv}
          disabled={!rows.length}
        >
          Copy CSV
        </button>
        <button
          id="exportCsv"
          class="btn secondary small"
          type="button"
          on:click={exportCsv}
          disabled={!rows.length}
        >
          Export CSV
        </button>
        <button
          id="exportJson"
          class="btn secondary small"
          type="button"
          on:click={exportJson}
          disabled={!rows.length}
        >
          Export JSON
        </button>
        <button
          id="shareBtn"
          class="btn ghost small"
          type="button"
          on:click={shareResults}
        >
          Share
        </button>
      </div>
    </header>

    {#if errorMessage}
      <p class="error-message" role="alert">
        {errorMessage}
      </p>
    {/if}

    <div class="results-toolbar">
      <div class="filter-group">
        <label>
          <input
            type="checkbox"
            class="statusFilter"
            data-group="2"
            bind:checked={statusFilters['2']}
          />
          2xx
        </label>
        <label>
          <input
            type="checkbox"
            class="statusFilter"
            data-group="3"
            bind:checked={statusFilters['3']}
          />
          3xx
        </label>
        <label>
          <input
            type="checkbox"
            class="statusFilter"
            data-group="4"
            bind:checked={statusFilters['4']}
          />
          4xx
        </label>
        <label>
          <input
            type="checkbox"
            class="statusFilter"
            data-group="5"
            bind:checked={statusFilters['5']}
          />
          5xx
        </label>
        <label>
          <input
            type="checkbox"
            class="statusFilter"
            data-group="null"
            bind:checked={statusFilters.null}
          />
          Other/null
        </label>
        <label>
          <input
            id="onlyBroken"
            type="checkbox"
            bind:checked={onlyBroken}
          />
          Only show broken
        </label>
      </div>

      <div class="search-group">
        <label for="search" class="visually-hidden">Filter results</label>
        <input
          id="search"
          class="field-input"
          type="search"
          placeholder="Filter by URL or note"
          bind:value={search}
        />
      </div>
    </div>

    <div class="tableWrap" aria-live="polite">
      <table id="results">
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">URL</th>
            <th scope="col">Status</th>
            <th scope="col">OK?</th>
            <th scope="col">Final URL</th>
            <th scope="col">Archive</th>
            <th scope="col">Note</th>
            <th scope="col">Chain</th>
          </tr>
        </thead>
        <tbody>
          {#if filteredRows.length === 0}
            <tr>
              <td colspan="8" class="empty-cell">
                {#if isRunning}
                  Checking links…
                {:else}
                  No results yet. Run a check to see broken links.
                {/if}
              </td>
            </tr>
          {:else}
            {#each filteredRows as row, index}
              <tr data-group={statusGroup(row.status as any)} data-ok={row.ok ? '1' : '0'}>
                <td>{index + 1}</td>
                <td class="cell-url">
                  <a
                    href={row.url}
                    target="_blank"
                    rel="noopener"
                    class="url-text"
                  >
                    {row.url}
                  </a>
                </td>
                <td>{row.status ?? ''}</td>
                <td>{row.ok ? '✅' : '❌'}</td>
                <td class="cell-url">
                  {#if row.finalUrl}
                    <a
                      href={row.finalUrl}
                      target="_blank"
                      rel="noopener"
                      class="url-text"
                    >
                      {row.finalUrl}
                    </a>
                  {/if}
                </td>
                <td>
                  {#if row.archive && row.archive.url}
                    <a
                      href={row.archive.url}
                      target="_blank"
                      rel="noopener"
                    >
                      snapshot
                    </a>
                  {/if}
                </td>
                <td>{row.note ?? ''}</td>
                <td>{row.chain ?? ''}</td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  </section>
</section>

{#if toast}
  <div class="toast" role="status" aria-live="polite">
    {toast}
  </div>
{/if}

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

  .tool-hero-subtitle {
    max-width: 640px;
    margin: 0 auto;
    color: var(--text-secondary, #cfd2e0);
    font-size: 0.98rem;
  }

  .tool-hero-meta {
    margin-top: 0.5rem;
    color: var(--text-muted, #9ba0b9);
    font-size: 0.9rem;
  }

  .tool-layout {
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
    gap: var(--space-6, 1.5rem);
    padding-bottom: var(--space-10, 2.5rem);
  }

  .card {
    border-radius: var(--radius-2xl, 18px);
    border: 1px solid var(--border-default, #25273a);
    background: var(--surface-base, #05060a);
    padding: var(--space-5, 1.25rem) var(--space-5, 1.25rem)
      var(--space-6, 1.5rem);
    box-shadow: 0 18px 45px rgba(15, 23, 42, 0.55);
  }

  .card-header {
    margin-bottom: var(--space-4, 1rem);
  }

  .card-header-results {
    display: flex;
    justify-content: space-between;
    gap: var(--space-4, 1rem);
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .card-subtitle {
    margin: 0.25rem 0 0;
    color: var(--text-secondary, #cfd2e0);
    font-size: 0.95rem;
  }

  .tool-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-5, 1.25rem);
  }

  .field-group {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .field-label {
    font-weight: 500;
    font-size: 0.92rem;
  }

  .field-input {
    width: 100%;
    border-radius: var(--radius-lg, 10px);
    border: 1px solid var(--border-default, #25273a);
    background: var(--surface-elevated, rgba(15, 23, 42, 0.9));
    padding: 0.55rem 0.75rem;
    color: var(--text-primary, #f9fafb);
    font-size: 0.92rem;
  }

  .field-input.mono {
    font-family: var(--font-mono, SFMono-Regular, Menlo, Monaco, Consolas,
        'Liberation Mono', 'Courier New', monospace);
    font-size: 0.86rem;
  }

  .field-help {
    margin: 0;
    font-size: 0.85rem;
    color: var(--text-muted, #9ba0b9);
  }

  .options-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: var(--space-4, 1rem);
  }

  .options-column {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .checkbox-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.88rem;
  }

  .checkbox-group label {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .field-row {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-bottom: 0.4rem;
  }

  .actions-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
  }

  .badge {
    font-size: 0.8rem;
    color: var(--text-muted, #9ba0b9);
  }

  .badge kbd {
    font-family: var(--font-mono, SFMono-Regular, Menlo, Monaco, Consolas,
        'Liberation Mono', 'Courier New', monospace);
    font-size: 0.78rem;
    border-radius: 4px;
    border: 1px solid var(--border-subtle, #1f2937);
    padding: 1px 5px;
  }

  .progress-banner {
    margin-top: 0.5rem;
    padding: 0.5rem 0.75rem;
    border-radius: 999px;
    background: var(--surface-elevated, rgba(15, 23, 42, 0.9));
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.86rem;
  }

  .progress-text {
    flex: 1;
  }

  .progress-banner progress {
    width: 120px;
    height: 6px;
  }

  .results-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    justify-content: flex-end;
  }

  .results-toolbar {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
    align-items: center;
    margin-bottom: 0.5rem;
    flex-wrap: wrap;
  }

  .filter-group {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    font-size: 0.82rem;
  }

  .filter-group label {
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }

  .search-group {
    min-width: min(220px, 100%);
  }

  .summary-text {
    margin: 0.25rem 0 0;
    font-size: 0.9rem;
    color: var(--text-secondary, #cfd2e0);
  }

  .meta-line {
    margin: 0.1rem 0 0;
    font-size: 0.82rem;
    color: var(--text-muted, #9ba0b9);
  }

  .tableWrap {
    margin-top: 0.5rem;
    max-height: 70vh;
    overflow: auto;
    border-radius: 12px;
    border: 1px solid var(--border-subtle, #171827);
  }

  #results {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.88rem;
  }

  #results thead th {
    position: sticky;
    top: 0;
    z-index: 1;
    background: var(--surface-header, #020617);
    color: var(--text-secondary, #e5e7eb);
    text-align: left;
    padding: 0.5rem 0.6rem;
    border-bottom: 1px solid var(--border-subtle, #111827);
  }

  #results tbody td {
    padding: 0.4rem 0.6rem;
    border-bottom: 1px solid var(--border-subtle, #111827);
    vertical-align: top;
  }

  #results tbody tr:last-child td {
    border-bottom: none;
  }

  .cell-url {
    word-break: break-all;
  }

  .url-text {
    display: inline-block;
    max-width: 420px;
  }

  .empty-cell {
    text-align: center;
    padding: 1rem 0.75rem;
    color: var(--text-muted, #9ba0b9);
  }

  .error-message {
    margin: 0 0 0.5rem;
    color: var(--color-error, #fca5a5);
    font-size: 0.9rem;
  }

  .toast {
    position: fixed;
    right: 16px;
    bottom: 16px;
    padding: 8px 12px;
    border-radius: 999px;
    background: rgba(15, 23, 42, 0.96);
    color: var(--text-primary, #f9fafb);
    font-size: 0.86rem;
    z-index: 9999;
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
  }

  .btn.small {
    padding: 4px 10px;
    font-size: 0.8rem;
  }

  .btn.ghost {
    background: transparent;
    border-color: var(--border-subtle, #1f2937);
  }

  .visually-hidden {
    position: absolute !important;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    border: 0;
    white-space: nowrap;
  }

  .advanced summary {
    cursor: pointer;
    font-size: 0.9rem;
  }

  .advanced-content {
    margin-top: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  @media (max-width: 900px) {
    .tool-layout {
      grid-template-columns: minmax(0, 1fr);
    }

    .card-header-results {
      flex-direction: column;
      align-items: flex-start;
    }

    .results-actions {
      width: 100%;
      justify-content: flex-start;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .card,
    .tool-hero-icon,
    .tool-hero-subtitle {
      animation: none !important;
      transition: none !important;
    }
  }
</style>
