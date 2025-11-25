<script lang="ts">
  import { downloadCsv, downloadJson, protectCsvCell } from '$lib/utils/download';

  type Row = {
    url: string;
    snapshotUrl?: string;
    snapshotTs?: string;
    verify?: { status?: string } | null;
    note?: string;
  };

  type Meta = {
    prefWindow?: 'any' | '5y' | '1y';
    verifyHead?: boolean;
    trySavePageNow?: boolean;
    spnQueued?: number;
    truncated?: boolean;
    timeoutMs?: number;
    concurrency?: {
      requested?: number;
      effective?: number;
      perOriginCap?: number;
      globalCap?: number;
    };
    requestId?: string;
    [key: string]: unknown;
  };

  let urlsText = '';
  let windowPref: 'any' | '5y' | '1y' = 'any';
  let verifyHead = true;
  let spn = false;
  let timeoutMs = 8000;
  let concurrency = 6;

  let rows: Row[] = [];
  let meta: Meta | null = null;
  let isRunning = false;
  let statusMsg = 'Ready.';
  let errorMessage: string | null = null;

  const DEMO = [
    'https://example.com/old-page',
    'https://example.com/missing-image',
    'https://example.com/docs/2018/handbook.pdf'
  ].join('\n');

  function setStatus(msg: string) {
    statusMsg = msg;
  }

  function loadDemo() {
    urlsText = DEMO;
    windowPref = '5y';
    verifyHead = true;
    spn = true;
    setStatus('Demo loaded — press Run.');
  }

  function stripInlineComments(line: string): string {
    return String(line || '')
      .replace(/\s+#.*$/, '')
      .replace(/\s+\/\/.*$/, '')
      .trim();
  }

  function normalizeList(raw: string): string[] {
    return (raw || '')
      .split(/[\r\n,;]+/)
      .map(stripInlineComments)
      .filter(Boolean);
  }

  async function runCheck() {
    if (isRunning) return;
    errorMessage = null;
    rows = [];
    meta = null;
    isRunning = true;
    setStatus('Requesting Wayback snapshots…');

    const list = normalizeList(urlsText);
    if (!list.length) {
      errorMessage = 'Enter at least one URL.';
      isRunning = false;
      return;
    }

    const body: Record<string, unknown> = {
      // Newline-separated list for the existing Edge handler
      list: list.join('\n'),
      prefWindow: windowPref,
      verifyHead,
      trySavePageNow: spn,
      timeout: timeoutMs,
      concurrency
    };

    try {
      const res = await fetch('/api/wayback-fixer', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) {
        const msg =
          data?.meta?.error || data?.error?.message || data?.message || 'Wayback Fixer request failed.';
        throw new Error(msg);
      }

      rows = Array.isArray(data.results) ? data.results : [];
      meta = (data.meta as Meta) || null;
      setStatus('Done.');
    } catch (error) {
      errorMessage = (error as Error)?.message ?? String(error);
      setStatus('Error.');
    } finally {
      isRunning = false;
    }
  }

  function downloadReplacements() {
    if (!rows.length) return;
    const header = ['source_url', 'replacement_url', 'snapshot_date_iso', 'verify_status', 'note'];
    const data: (string | number)[][] = rows.map((r) => [
      protectCsvCell(r.url || ''),
      protectCsvCell(r.snapshotUrl || ''),
      protectCsvCell(r.snapshotTs || ''),
      protectCsvCell(r.verify ? r.verify.status || '' : ''),
      protectCsvCell(r.note || '')
    ]);
    downloadCsv('wayback-replacements.csv', [header, ...data], meta || undefined);
  }

  function download410() {
    if (!rows.length) return;
    const header = ['url_to_remove', 'reason'];
    const data: (string | number)[][] = rows
      .filter((r) => (r.note || '').includes('no_snapshot'))
      .map((r) => [protectCsvCell(r.url || ''), 'no_snapshot']);
    downloadCsv('wayback-410.csv', [header, ...data], meta || undefined);
  }

  function downloadJsonResults() {
    if (!rows.length) return;
    downloadJson('wayback-results.json', { meta, results: rows });
  }
</script>

<svelte:window
  on:keydown={(event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      if (!isRunning) runCheck();
    }
  }}
/>

<svelte:head>
  <title>Wayback Fixer — TinyUtils</title>
  <meta
    name="description"
    content="Find the best Wayback snapshot for dead URLs, verify with HEAD, and export replacements or 410s."
  />
  <link rel="canonical" href="/tools/wayback-fixer/" />
</svelte:head>

<section class="tool-hero">
  <div class="container">
    <span class="tool-hero-icon" aria-hidden="true">⏪</span>
    <h1>Wayback Fixer</h1>
    <p class="tool-hero-subtitle">
      Paste dead URLs and get the best Wayback snapshot for each. Export replacements &amp; 410s.
    </p>
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

<section class="card container" aria-labelledby="inputs">
  <h2 id="inputs">Inputs</h2>
  <label class="field">
    <span class="field-label">URL list (one per line)</span>
    <textarea
      id="urlsList"
      class="input mono"
      rows="6"
      bind:value={urlsText}
      placeholder="https://example.com/old-page\nhttps://example.com/broken"
    ></textarea>
  </label>

  <div class="options-grid">
    <label class="field">
      <span class="field-label">Window</span>
      <select class="input" bind:value={windowPref}>
        <option value="any">Any</option>
        <option value="5y">Last 5y</option>
        <option value="1y">Last 1y</option>
      </select>
    </label>
    <label class="field">
      <span class="field-label">Timeout (ms)</span>
      <input class="input" type="number" min="1000" max="20000" bind:value={timeoutMs} />
    </label>
    <label class="field">
      <span class="field-label">Concurrency</span>
      <input class="input" type="number" min="1" max="10" bind:value={concurrency} />
    </label>
  </div>

  <div class="checkboxes">
    <label><input type="checkbox" bind:checked={verifyHead} /> Verify snapshots with HEAD</label>
    <label><input type="checkbox" bind:checked={spn} /> Queue Save Page Now (cap 10)</label>
  </div>

  <div class="actions-row">
    <button class="btn primary" type="button" on:click={runCheck} disabled={isRunning}>
      {isRunning ? 'Running…' : 'Run'}
    </button>
    <button class="btn secondary" type="button" on:click={loadDemo} disabled={isRunning}>
      Load demo
    </button>
    <span class="hint">Cmd/Ctrl+Enter runs</span>
  </div>
  <p class="status" aria-live="polite">{statusMsg}</p>
  {#if errorMessage}
    <p class="error" role="alert">{errorMessage}</p>
  {/if}
</section>

<section class="card container" aria-labelledby="results">
  <header class="card-header">
    <h2 id="results">Results</h2>
    {#if meta}
      <p class="meta-line">
        Window: {(meta.prefWindow || windowPref)} · Verify:
        {(meta.verifyHead ?? verifyHead) ? 'ON' : 'OFF'} · SPN:
        {(meta.trySavePageNow ?? spn) ? 'ON' : 'OFF'}
        {#if meta.truncated} · Truncated{/if}
      </p>
    {:else}
      <p class="meta-line">Run a check to see snapshots.</p>
    {/if}
  </header>

  <div class="export-row">
    <button class="btn secondary" type="button" on:click={downloadReplacements} disabled={!rows.length}>
      Replacements CSV
    </button>
    <button class="btn secondary" type="button" on:click={download410} disabled={!rows.length}>
      410 CSV
    </button>
    <button class="btn secondary" type="button" on:click={downloadJsonResults} disabled={!rows.length}>
      JSON
    </button>
  </div>

  <div class="tableWrap">
    <table id="resultsTable">
      <thead>
        <tr>
          <th>#</th>
          <th>URL</th>
          <th>Snapshot</th>
          <th>Verify</th>
          <th>Note</th>
        </tr>
      </thead>
      <tbody>
        {#if rows.length === 0}
          <tr><td colspan="5" class="empty">No results yet.</td></tr>
        {:else}
          {#each rows as r, i}
            <tr>
              <td>{i + 1}</td>
              <td class="break">{r.url}</td>
              <td class="break">
                {#if r.snapshotUrl}
                  <a href={r.snapshotUrl} target="_blank" rel="noopener">snapshot</a>
                  {#if r.snapshotTs}
                    <div class="muted">{r.snapshotTs}</div>
                  {/if}
                {/if}
              </td>
              <td>{r.verify?.status ?? ''}</td>
              <td class="break">{r.note ?? ''}</td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>
</section>

<style>
  .container {
    max-width: 1200px;
    margin: 0 auto;
  }

  .tool-hero {
    text-align: center;
    padding: var(--space-10, 2.5rem) 0 var(--space-6, 1.5rem);
  }

  .tool-hero-icon {
    font-size: 3rem;
    display: block;
    margin-bottom: var(--space-3, 0.75rem);
  }

  .tool-hero-subtitle {
    max-width: 720px;
    margin: 0 auto;
    color: var(--text-secondary, #cfd2e0);
  }

  .card {
    border-radius: var(--radius-2xl, 18px);
    border: 1px solid var(--border-default, #25273a);
    background: var(--surface-base, #05060a);
    padding: var(--space-5, 1.25rem);
    box-shadow: 0 18px 45px rgba(15, 23, 42, 0.55);
    margin-bottom: var(--space-5, 1.25rem);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .field-label {
    font-weight: 600;
    font-size: 0.95rem;
  }

  .input,
  textarea {
    width: 100%;
    border-radius: var(--radius-lg, 10px);
    border: 1px solid var(--border-default, #25273a);
    background: var(--surface-elevated, rgba(15, 23, 42, 0.9));
    padding: 0.55rem 0.75rem;
    color: var(--text-primary, #f9fafb);
    font-size: 0.92rem;
  }

  .mono {
    font-family: var(--font-mono, SFMono-Regular, Menlo, Monaco, Consolas,
        'Liberation Mono', 'Courier New', monospace);
    font-size: 0.9rem;
  }

  .options-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--space-3, 0.75rem);
    margin: var(--space-3, 0.75rem) 0;
  }

  .checkboxes {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    font-size: 0.92rem;
  }

  .actions-row {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    flex-wrap: wrap;
    margin-top: var(--space-3, 0.75rem);
  }

  .hint {
    color: var(--text-muted, #9ba0b9);
  }

  .status {
    margin-top: var(--space-2, 0.5rem);
    color: var(--text-secondary, #cfd2e0);
  }

  .error {
    color: var(--color-error, #fca5a5);
    margin-top: var(--space-2, 0.5rem);
  }

  .export-row {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-bottom: var(--space-3, 0.75rem);
  }

  .tableWrap {
    max-height: 420px;
    overflow: auto;
    border: 1px solid var(--border-subtle, #171827);
    border-radius: 12px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
  }

  thead th {
    position: sticky;
    top: 0;
    background: var(--surface-header, #020617);
    text-align: left;
    padding: 0.5rem 0.6rem;
    border-bottom: 1px solid var(--border-subtle, #111827);
  }

  tbody td {
    padding: 0.45rem 0.6rem;
    border-bottom: 1px solid var(--border-subtle, #111827);
    vertical-align: top;
  }

  tbody tr:last-child td {
    border-bottom: none;
  }

  .break {
    word-break: break-all;
  }

  .muted {
    color: var(--text-muted, #9ba0b9);
    font-size: 0.82rem;
  }

  .empty {
    text-align: center;
    color: var(--text-muted, #9ba0b9);
  }
</style>
