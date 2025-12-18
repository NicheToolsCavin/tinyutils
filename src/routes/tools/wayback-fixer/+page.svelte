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
      data-testid="wayback-urls-input"
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
    <button
      class="btn primary"
      type="button"
      data-testid="wayback-run"
      on:click={runCheck}
      disabled={isRunning}
    >
      {isRunning ? 'Running…' : 'Run'}
    </button>
    <button
      class="btn secondary"
      type="button"
      data-testid="wayback-load-demo"
      on:click={loadDemo}
      disabled={isRunning}
    >
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
  /* ═══════════════════════════════════════════════════════════
     LIQUID GLASS WAYBACK FIXER
     ═══════════════════════════════════════════════════════════ */

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
    margin-bottom: var(--space-5);
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

  :global(html[data-theme="light"]) .card:hover {
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1),
                inset 0 1px 0 rgba(255, 255, 255, 0.9);
  }

  :global(html[data-theme="light"]) .card::after {
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.7) 0%, transparent 100%);
    opacity: 1;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    position: relative;
    z-index: 1;
  }

  .field-label {
    font-weight: var(--font-semibold);
    font-size: 0.95rem;
    color: var(--text-primary);
  }

  /* Glass inputs */
  .input,
  textarea {
    width: 100%;
    border-radius: var(--radius-lg);
    border: 1px solid var(--glass-border);
    background: var(--glass-bg);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    padding: 0.55rem 0.75rem;
    color: var(--text-primary);
    font-size: 0.92rem;
    transition: all 0.2s ease;
  }

  .input:focus,
  textarea:focus {
    outline: none;
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
  }

  :global(html[data-theme="light"]) .input,
  :global(html[data-theme="light"]) textarea {
    background: rgba(255, 255, 255, 0.6);
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.06);
  }

  .mono {
    font-family: var(--font-mono);
    font-size: 0.9rem;
  }

  .options-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--space-3);
    margin: var(--space-3) 0;
    position: relative;
    z-index: 1;
  }

  .checkboxes {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    font-size: 0.92rem;
    color: var(--text-secondary);
  }

  .actions-row {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    flex-wrap: wrap;
    margin-top: var(--space-3);
    position: relative;
    z-index: 1;
  }

  .hint {
    color: var(--text-tertiary);
    font-size: var(--text-sm);
  }

  .hint kbd {
    font-family: var(--font-mono);
    font-size: 0.78rem;
    border-radius: 4px;
    border: 1px solid var(--glass-border);
    padding: 1px 5px;
    background: var(--glass-bg);
  }

  .status {
    margin-top: var(--space-2);
    color: var(--text-secondary);
    position: relative;
    z-index: 1;
  }

  .error {
    color: var(--color-error, #fca5a5);
    margin-top: var(--space-2);
    position: relative;
    z-index: 1;
  }

  .export-row {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-bottom: var(--space-3);
    position: relative;
    z-index: 1;
  }

  /* Glass table wrapper */
  .tableWrap {
    max-height: 420px;
    overflow: auto;
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-xl);
    background: var(--glass-bg);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }

  :global(html[data-theme="light"]) .tableWrap {
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06),
                inset 0 1px 0 rgba(255, 255, 255, 0.8);
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
  }

  thead th {
    position: sticky;
    top: 0;
    background: var(--glass-bg-hover);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    text-align: left;
    padding: 0.6rem 0.75rem;
    border-bottom: 1px solid var(--glass-border);
    color: var(--text-primary);
    font-weight: var(--font-semibold);
  }

  :global(html[data-theme="light"]) thead th {
    background: rgba(255, 255, 255, 0.8);
  }

  tbody td {
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid var(--glass-border);
    vertical-align: top;
    color: var(--text-secondary);
  }

  tbody tr:hover {
    background: var(--glass-bg-hover);
  }

  tbody tr:last-child td {
    border-bottom: none;
  }

  tbody a {
    color: var(--accent-primary);
    text-decoration: none;
  }

  tbody a:hover {
    text-decoration: underline;
    color: var(--accent-secondary);
  }

  .break {
    word-break: break-all;
  }

  .muted {
    color: var(--text-tertiary);
    font-size: 0.82rem;
  }

  .empty {
    text-align: center;
    color: var(--text-tertiary);
  }
</style>
