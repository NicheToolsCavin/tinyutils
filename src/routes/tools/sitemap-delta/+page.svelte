<script lang="ts">
  import { onMount } from 'svelte';
  import { downloadCsv, downloadFile, downloadJson, protectCsvCell } from '$lib/utils/download';

  type Pair = {
    from: string;
    to: string;
    confidence?: number;
    note?: string;
    method?: string;
  };

  type Rule = {
    fromPrefix: string;
    toPrefix: string;
  };

  type Meta = {
    runTimestamp?: string;
    removedCount?: number;
    addedCount?: number;
    suggestedMappings?: number;
    truncated?: boolean;
    verify?: boolean;
    timeoutMs?: number;
    sameRegDomainOnly?: boolean;
    maxCompare?: number;
    fetchCaps?: {
      global?: number;
      perOrigin?: number;
    };
    notes?: string[];
    requestId?: string;
    [key: string]: unknown;
  };

  type ApiSuccess = {
    meta: Meta;
    added: string[];
    removed: string[];
    pairs: Pair[];
    unmapped: string[];
    rules?: Rule[];
  };

  type ApiError = {
    error: string;
    details?: {
      message?: string;
      note?: string;
      meta?: Meta;
    };
    meta?: Meta;
    added?: string[];
    removed?: string[];
    pairs?: Pair[];
    unmapped?: string[];
    rules?: Rule[];
  };

  const MULTI_PART_PUBLIC_SUFFIXES = ['co.uk', 'ac.uk', 'gov.uk', 'org.uk', 'co.nz', 'com.au'];

  function registrable(host: string): string {
    const h = (host || '').toLowerCase();
    const parts = h.split('.').filter(Boolean);
    if (parts.length <= 1) return h;

    const suffix = MULTI_PART_PUBLIC_SUFFIXES.find(
      (suf) => h === suf || h.endsWith(`.${suf}`)
    );
    if (suffix) {
      const suffixParts = suffix.split('.');
      const labelsBefore = parts.slice(0, parts.length - suffixParts.length);
      const sld = labelsBefore.pop();
      if (!sld) return suffix;
      return `${sld}.${suffix}`;
    }

    return parts.slice(-2).join('.');
  }

  function sameRegDomain(a: string, b: string): boolean {
    try {
      const A = new URL(a).hostname;
      const B = new URL(b).hostname;
      return registrable(A) === registrable(B);
    } catch {
      return false;
    }
  }

  // Inputs
  let sitemapAUrl = '';
  let sitemapAText = '';
  let sitemapBUrl = '';
  let sitemapBText = '';
  let verifyTargets = false;
  let sameRegDomainOnly = true;
  let timeoutMs = 10000;
  let maxCompare = 2000;

  // UI state
  let isBusy = false;
  let statusMessage = 'Ready.';
  let statusPercent = 0;
  let errorMessage: string | null = null;
  let toastMessage = '';

  function showToast(msg: string, durationMs = 2000) {
    toastMessage = msg;
    setTimeout(() => { toastMessage = ''; }, durationMs);
  }

  // Results
  let lastResults: ApiSuccess | null = null;
  let confThreshold = 0;

  type Filtered = {
    meta: Meta;
    added: string[];
    removed: string[];
    pairs: Pair[];
    unmapped: string[];
    rules: Rule[];
  };

  function computeFiltered(data: ApiSuccess | null): Filtered {
    if (!data) {
      return {
        meta: {},
        added: [],
        removed: [],
        pairs: [],
        unmapped: [],
        rules: []
      };
    }

    const conf = confThreshold || 0;
    const guard = sameRegDomainOnly;

    const pairs = (data.pairs || []).filter((p) => {
      const score = p.confidence ?? 0;
      if (score < conf) return false;
      if (guard && (!p.from || !p.to)) return false;
      if (guard && !sameRegDomain(p.from, p.to)) return false;
      return true;
    });

    const mappedFrom = new Set(pairs.map((p) => p.from));
    const unmapped = (data.removed || []).filter((u) => !mappedFrom.has(u));
    const rules = data.rules || [];

    return {
      meta: data.meta || {},
      added: data.added || [],
      removed: data.removed || [],
      pairs,
      unmapped,
      rules
    };
  }

  $: filtered = computeFiltered(lastResults);

  function setStatus(message: string, progress: number | null) {
    statusMessage = message;
    if (progress == null) {
      statusPercent = 0;
    } else {
      statusPercent = Math.max(0, Math.min(100, progress));
    }
  }

  function buildHashPayload() {
    return {
      a: sitemapAUrl || undefined,
      b: sitemapBUrl || undefined,
      v: verifyTargets || undefined,
      t: Number(timeoutMs) || undefined,
      l: Number(maxCompare) || undefined
    };
  }

  function paramsToHash(): string {
    return '#' + encodeURIComponent(JSON.stringify(buildHashPayload()));
  }

  function restoreFromHash(initial = false) {
    if (typeof window === 'undefined') return;
    if (!window.location.hash) return;

    try {
      const payload = JSON.parse(
        decodeURIComponent(window.location.hash.slice(1))
      ) as Record<string, unknown>;

      if (!payload || typeof payload !== 'object') {
        throw new Error('bad share payload');
      }

      if ('a' in payload) sitemapAUrl = String(payload.a ?? '');
      if ('b' in payload) sitemapBUrl = String(payload.b ?? '');
      if ('v' in payload) verifyTargets = Boolean(payload.v);
      if (
        't' in payload &&
        Number.isFinite(Number((payload as { t?: unknown }).t))
      ) {
        timeoutMs = Number((payload as { t?: unknown }).t);
      }
      if (
        'l' in payload &&
        Number.isFinite(Number((payload as { l?: unknown }).l))
      ) {
        maxCompare = Number((payload as { l?: unknown }).l);
      }

      if (!initial) {
        setStatus('Share settings loaded.', statusPercent || 0);
      }
    } catch {
      window.location.hash = '';
      if (!initial) {
        setStatus('Share link invalid — defaults restored.', statusPercent || 0);
      }
    }
  }

  async function loadDemo() {
    if (typeof fetch === 'undefined') return;
    try {
      setStatus('Loading demo sitemaps…', 10);
      const [before, after] = await Promise.all([
        fetch('/tools/sitemap-delta/demo/before.xml').then((r) => r.text()),
        fetch('/tools/sitemap-delta/demo/after.xml').then((r) => r.text())
      ]);
      sitemapAText = before;
      sitemapBText = after;
      setStatus('Demo loaded. Adjust options and click Run.', 40);
    } catch (error) {
      console.error(error);
      errorMessage = 'Demo load failed — you can still paste your own sitemaps.';
      setStatus('Demo load failed.', null);
    }
  }

  async function runCompare() {
    if (isBusy) return;
    errorMessage = null;
    isBusy = true;
    setStatus('Comparing sitemaps…', 10);

    const body: Record<string, unknown> = {
      sitemapAUrl: sitemapAUrl || undefined,
      sitemapAText: sitemapAText || undefined,
      sitemapBUrl: sitemapBUrl || undefined,
      sitemapBText: sitemapBText || undefined,
      verifyTargets,
      sameRegDomainOnly,
      timeout: timeoutMs,
      maxCompare
    };

    try {
      const res = await fetch('/api/sitemap-delta', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = (await res.json()) as ApiSuccess | ApiError;

      if (!res.ok || (data as ApiError).error) {
        const err = data as ApiError;
        errorMessage =
          err.details?.message ||
          err.error ||
          'Something went wrong comparing your sitemaps.';
        lastResults = {
          meta: err.meta || err.details?.meta || {},
          added: err.added || [],
          removed: err.removed || [],
          pairs: err.pairs || [],
          unmapped: err.unmapped || [],
      rules: err.rules || []
        };
        setStatus('Error.', null);
      } else {
        const ok = data as ApiSuccess;
        lastResults = {
          meta: ok.meta || {},
          added: ok.added || [],
          removed: ok.removed || [],
          pairs: ok.pairs || [],
          unmapped: ok.unmapped || [],
          rules: ok.rules || []
        };
        setStatus('Done.', 100);

        if (typeof window !== 'undefined') {
          const hash = paramsToHash();
          window.history.replaceState(null, '', hash);
        }
      }
    } catch (error) {
      console.error(error);
      errorMessage = (error as Error)?.message ?? String(error);
      setStatus('Error.', null);
    } finally {
      isBusy = false;
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      if (!isBusy) runCompare();
    }
  }

  function downloadRedirectCsv() {
    if (!lastResults) return;
    const meta = filtered.meta || {};
    const rows: (string | number)[][] = [['from_url', 'to_url', 'confidence', 'note']];

    filtered.pairs.forEach((p) => {
      rows.push([
        p.from || '',
        p.to || '',
        (p.confidence ?? 0).toFixed(3),
        p.note || ''
      ]);
    });

    const metaLine = {
      ...meta,
      threshold: confThreshold,
      sameDomainGuard: sameRegDomainOnly
    };

    downloadCsv('sitemap-delta-redirects.csv', rows, metaLine);
  }

  function download410Csv() {
    if (!lastResults) return;
    const rows: (string | number)[][] = [['url_to_remove', 'reason']];
    filtered.unmapped.forEach((u) => {
      rows.push([u, '410']);
    });
    downloadCsv('unmapped-410.csv', rows);
  }

  function downloadResultsJson() {
    if (!lastResults) return;
    const payload = {
      ...lastResults,
      meta: {
        ...lastResults.meta,
        threshold: confThreshold,
        sameDomainGuard: sameRegDomainOnly
      }
    };
    downloadJson('sitemap-delta-results.json', payload);
  }

  function downloadNginxRules() {
    if (!lastResults) return;
    const { pairs, rules } = filtered;
    const lines: string[] = [];

    (rules || []).forEach((r) =>
      lines.push(`rewrite ^${r.fromPrefix}(.*)$ ${r.toPrefix}$1 permanent;`)
    );

    (pairs || []).forEach((p) => {
      try {
        const from = new URL(p.from);
        const to = new URL(p.to);
        if (from.host === to.host) {
          lines.push(`rewrite ^${from.pathname}$ ${to.pathname} permanent;`);
        } else {
          lines.push(`rewrite ^${from.pathname}$ ${to.href} permanent;`);
        }
      } catch {
        lines.push(`# ${p.from} -> ${p.to}`);
      }
    });

    downloadFile('redirects-nginx.conf', 'text/plain', lines.join('\n'));
  }

  function downloadApacheRules() {
    if (!lastResults) return;
    const { pairs, rules } = filtered;
    const lines: string[] = [];

    (rules || []).forEach((r) =>
      lines.push(`# Prefix: ${r.fromPrefix} -> ${r.toPrefix}`)
    );

    (pairs || []).forEach((p) => {
      try {
        const from = new URL(p.from);
        const to = new URL(p.to);
        if (from.host === to.host) {
          lines.push(`Redirect 301 ${from.pathname} ${to.pathname}`);
        } else {
          lines.push(`Redirect 301 ${from.pathname} ${to.href}`);
        }
      } catch {
        lines.push(`# ${p.from} -> ${p.to}`);
      }
    });

    downloadFile('redirects-apache.conf', 'text/plain', lines.join('\n'));
  }

  function copySummary() {
    if (!lastResults || typeof navigator === 'undefined' || !navigator.clipboard) return;
    const meta = filtered.meta || {};
    const totalRemoved = meta.removedCount ?? filtered.removed.length;
    const totalAdded = meta.addedCount ?? filtered.added.length;
    const suggested = meta.suggestedMappings ?? filtered.pairs.length;

    const summary = [
      `Sitemap Delta summary`,
      `Removed URLs: ${totalRemoved}`,
      `Added URLs: ${totalAdded}`,
      `Suggested 301 mappings: ${suggested}`,
      `Confidence threshold: ${confThreshold.toFixed(2)}`,
      sameRegDomainOnly ? `Same-domain guard: ON` : `Same-domain guard: OFF`
    ].join('\n');

    navigator.clipboard
      .writeText(summary)
      .then(() => showToast('Summary copied to clipboard'))
      .catch((err) => showToast('Copy failed: ' + (err?.message || 'Unknown error')));
  }

  function copyRulesText() {
    if (!lastResults || typeof navigator === 'undefined' || !navigator.clipboard) return;
    const lines: string[] = [];
    const { pairs, rules } = filtered;

    (rules || []).forEach((r) =>
      lines.push(`# Prefix: ${r.fromPrefix} -> ${r.toPrefix}`)
    );

    (pairs || []).forEach((p) => {
      try {
        const from = new URL(p.from);
        const to = new URL(p.to);
        lines.push(`${from.pathname} -> ${to.href}`);
      } catch {
        lines.push(`# ${p.from} -> ${p.to}`);
      }
    });

    const txt = lines.join('\n');
    navigator.clipboard
      .writeText(txt)
      .then(() => showToast('Rules copied to clipboard'))
      .catch((err) => showToast('Copy failed: ' + (err?.message || 'Unknown error')));
  }

  function shareLink() {
    if (typeof window === 'undefined' || typeof navigator === 'undefined' || !navigator.clipboard) return;
    const hash = paramsToHash();
    window.location.hash = hash;
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => showToast('Share link copied to clipboard'))
      .catch((err) => showToast('Copy failed: ' + (err?.message || 'Unknown error')));
  }

  onMount(() => {
    if (typeof window !== 'undefined') {
      const handler = () => restoreFromHash(false);

      restoreFromHash(true);
      window.addEventListener('hashchange', handler);

      try {
        const el = document.getElementById('sitemapAUrl') as HTMLInputElement | null;
        if (el) el.focus();
      } catch {
        /* noop */
      }

      return () => {
        window.removeEventListener('hashchange', handler);
      };
    }

    try {
      const el = document.getElementById('sitemapAUrl') as HTMLInputElement | null;
      if (el) el.focus();
    } catch {
      /* noop */
    }
  });
</script>

<svelte:window on:keydown={handleKeydown} />

<svelte:head>
  <title>Sitemap Delta + Redirect Mapper — TinyUtils</title>
  <meta
    name="description"
    content="Compare two sitemaps, see added/removed URLs, and generate 301 redirect and 410 rules for SEO‑safe migrations."
  />
  <link rel="canonical" href="https://tinyutils.net/tools/sitemap-delta/" />
  <meta property="og:title" content="Sitemap Delta + Redirect Mapper — TinyUtils" />
  <meta
    property="og:description"
    content="Diff before/after sitemaps, map redirects, and export Nginx/Apache/410 rules."
  />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="/og.png" />
  <meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<div class="tool-page">
  <section class="tool-hero">
    <span class="tool-hero-icon" aria-hidden="true">🗺️</span>
    <h1>Sitemap Delta + Redirect Mapper</h1>
    <p class="tool-hero-subtitle">
      Paste your <strong>before</strong> and <strong>after</strong> sitemaps. We’ll highlight
      what changed and suggest clean 301 rules and 410s for your migration.
    </p>
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
      <div>
        <h2>Before sitemap</h2>
        <label class="field">
          <span class="field-label">URL</span>
          <input
            id="sitemapAUrl"
            class="input"
            bind:value={sitemapAUrl}
            type="url"
            placeholder="https://example.com/sitemap.xml"
          />
        </label>
        <label class="field">
          <span class="field-label">XML (optional override)</span>
          <textarea
            class="textarea"
            bind:value={sitemapAText}
            rows="6"
            placeholder="Paste sitemap XML here (optional override for URL)"
          ></textarea>
        </label>
      </div>

      <div>
        <h2>After sitemap</h2>
        <label class="field">
          <span class="field-label">URL</span>
          <input
            class="input"
            bind:value={sitemapBUrl}
            type="url"
            placeholder="https://example.com/sitemap-new.xml"
          />
        </label>
        <label class="field">
          <span class="field-label">XML (optional override)</span>
          <textarea
            class="textarea"
            bind:value={sitemapBText}
            rows="6"
            placeholder="Paste sitemap XML here (optional override for URL)"
          ></textarea>
        </label>
      </div>
    </div>

    <div class="options-grid">
      <label class="field">
        <span class="field-label">Timeout (ms)</span>
        <input
          class="input"
          type="number"
          min="1000"
          max="30000"
          bind:value={timeoutMs}
        />
      </label>

      <label class="field">
        <span class="field-label">Max URLs to compare</span>
        <input
          class="input"
          type="number"
          min="100"
          max="5000"
          bind:value={maxCompare}
        />
      </label>

      <label class="checkbox">
        <input type="checkbox" bind:checked={verifyTargets} />
        <span>Verify targets (extra network load)</span>
      </label>

      <label class="checkbox">
        <input type="checkbox" bind:checked={sameRegDomainOnly} />
        <span>Same registrable domain only (safer redirects)</span>
      </label>
    </div>

    <div class="actions-row">
      <button
        class="btn primary"
        type="button"
        on:click={runCompare}
        disabled={isBusy}
      >
        {#if isBusy}
          Comparing…
        {:else}
          Run diff
        {/if}
      </button>
      <button class="btn ghost" type="button" on:click={loadDemo} disabled={isBusy}>
        Load demo
      </button>
      <button class="btn ghost" type="button" on:click={shareLink}>
        Copy shareable link
      </button>

      <div class="hint">
        <kbd>Ctrl/⌘</kbd> + <kbd>Enter</kbd> to run
      </div>
    </div>

    <div class="status-bar" aria-live="polite">
      <span>{statusMessage}</span>
      <progress
        value={statusPercent}
        max="100"
        aria-hidden={statusPercent === 0}
      ></progress>
    </div>

    {#if errorMessage}
      <p class="error" role="alert">{errorMessage}</p>
    {/if}

    {#if toastMessage}
      <div class="toast" role="status" aria-live="polite">{toastMessage}</div>
    {/if}
  </section>

  <section class="card">
    <header class="card-header">
      <h2>Results</h2>
      <p id="summaryLine" class="summary-line">
        {#if lastResults}
          <span class="chips">
            <span class="chip">
              Removed: <b>{filtered.meta.removedCount ?? filtered.removed.length}</b>
            </span>
            <span class="chip">
              Added: <b>{filtered.meta.addedCount ?? filtered.added.length}</b>
            </span>
            <span class="chip">
              Suggested mappings: <b>{filtered.meta.suggestedMappings ?? filtered.pairs.length}</b>
            </span>
            {#if filtered.meta.truncated}
              <span class="chip chip-warn">Truncated</span>
            {/if}
          </span>
        {:else}
          <span>No results yet — run a comparison to see changes.</span>
        {/if}
      </p>
    </header>

    <div class="confidence-controls">
      <span class="field-label">Confidence threshold</span>
      <div class="chips">
        {#each [0, 0.5, 0.8, 0.9] as thr}
          <button
            type="button"
            class:chip-active={confThreshold === thr}
            class="chip chip-button"
            on:click={() => (confThreshold = thr)}
          >
            ≥ {thr.toFixed(2)}
          </button>
        {/each}
      </div>
    </div>

    <div class="export-row">
      <button
        class="btn secondary"
        type="button"
        on:click={downloadRedirectCsv}
        disabled={!lastResults}
      >
        Download CSV
      </button>
      <button
        class="btn secondary"
        type="button"
        on:click={downloadResultsJson}
        disabled={!lastResults}
      >
        Download JSON
      </button>
      <button
        class="btn secondary"
        type="button"
        on:click={download410Csv}
        disabled={!lastResults}
      >
        410 CSV
      </button>
      <button
        class="btn secondary"
        type="button"
        on:click={downloadNginxRules}
        disabled={!lastResults}
      >
        Nginx rules
      </button>
      <button
        class="btn secondary"
        type="button"
        on:click={downloadApacheRules}
        disabled={!lastResults}
      >
        Apache rules
      </button>
      <button
        class="btn ghost"
        type="button"
        on:click={copySummary}
        disabled={!lastResults}
      >
        Copy summary
      </button>
      <button
        class="btn ghost"
        type="button"
        on:click={copyRulesText}
        disabled={!lastResults}
      >
        Copy rules
      </button>
    </div>

    <div class="results-tables">
      <div class="tableWrap">
        <table id="mapTable">
          <thead>
            <tr>
              <th>From</th>
              <th>To</th>
              <th>Confidence</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {#if filtered.pairs.length === 0}
              <tr><td colspan="4" class="empty-cell">No mappings yet.</td></tr>
            {:else}
              {#each filtered.pairs as p}
                <tr>
                  <td>{p.from}</td>
                  <td>{p.to}</td>
                  <td>{(p.confidence ?? 0).toFixed(3)}</td>
                  <td>{p.note ?? ''}</td>
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
      </div>

      <div class="tableWrap">
        <table id="unmappedTable">
          <thead>
            <tr>
              <th>Unmapped URLs (removed)</th>
            </tr>
          </thead>
          <tbody>
            {#if filtered.unmapped.length === 0}
              <tr><td class="empty-cell">No unmapped URLs.</td></tr>
            {:else}
              {#each filtered.unmapped as u}
                <tr><td>{u}</td></tr>
              {/each}
            {/if}
          </tbody>
        </table>
      </div>

      <div class="tableWrap">
        <table id="addedTable">
          <thead>
            <tr>
              <th>Added URLs</th>
            </tr>
          </thead>
          <tbody>
            {#if filtered.added.length === 0}
              <tr><td class="empty-cell">No added URLs.</td></tr>
            {:else}
              {#each filtered.added as a}
                <tr><td>{a}</td></tr>
              {/each}
            {/if}
          </tbody>
        </table>
      </div>
    </div>
  </section>
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
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--space-5);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin-bottom: var(--space-3);
  }

  .field-label {
    font-weight: var(--font-semibold);
    font-size: var(--text-sm);
  }

  .input,
  .textarea {
    width: 100%;
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-default);
    background: var(--surface-base);
    padding: var(--space-3) var(--space-4);
    color: var(--text-primary);
    font-size: var(--text-base);
  }

  .textarea {
    min-height: 140px;
  }

  .options-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: var(--space-3);
    margin: var(--space-4) 0;
  }

  .checkbox {
    display: flex;
    gap: var(--space-2);
    align-items: center;
    font-size: var(--text-sm);
  }

  .actions-row {
    display: flex;
    gap: var(--space-2);
    align-items: center;
    flex-wrap: wrap;
    margin-top: var(--space-3);
  }

  .hint {
    font-size: var(--text-sm);
    color: var(--text-tertiary);
  }

  .status-bar {
    margin-top: var(--space-3);
    display: flex;
    gap: var(--space-3);
    align-items: center;
  }

  .status-bar progress {
    height: 6px;
    width: 160px;
  }

  .error {
    color: var(--color-danger);
    margin-top: var(--space-2);
  }

  .card-header {
    margin-bottom: var(--space-3);
  }

  .summary-line {
    margin: var(--space-1) 0 0;
    color: var(--text-secondary);
    font-size: var(--text-base);
  }

  .chips {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
  }

  .chip {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-1) var(--space-3);
    border-radius: var(--radius-full);
    background: var(--surface-raised);
    color: var(--text-secondary);
    font-size: var(--text-xs);
  }

  .chip-warn {
    background: var(--warning-bg);
    color: var(--warning-text);
  }

  .confidence-controls {
    margin: var(--space-4) 0;
  }

  .chip-button {
    border: 1px solid var(--border-default);
    background: transparent;
    cursor: pointer;
  }

  .chip-active {
    background: var(--brand-500);
    color: var(--text-inverse);
    border-color: var(--brand-500);
  }

  .export-row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin-bottom: var(--space-4);
  }

  .results-tables {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--space-4);
  }

  .tableWrap {
    max-height: 320px;
    overflow: auto;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--text-sm);
  }

  thead th {
    position: sticky;
    top: 0;
    background: var(--surface-base);
    text-align: left;
    padding: var(--space-2) var(--space-3);
    border-bottom: 1px solid var(--border-default);
  }

  tbody td {
    padding: var(--space-2) var(--space-3);
    border-bottom: 1px solid var(--border-subtle);
    vertical-align: top;
    word-break: break-word;
  }

  tbody tr:last-child td {
    border-bottom: none;
  }

  .empty-cell {
    text-align: center;
    color: var(--text-tertiary);
  }

  @media (max-width: 900px) {
    .results-tables {
      grid-template-columns: 1fr;
    }
  }

  .toast {
    position: fixed;
    bottom: 16px;
    right: 16px;
    background: var(--brand-500, #3b82f6);
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    font-size: 0.9rem;
    animation: slideIn 0.3s ease-out;
    z-index: 1000;
  }

  @keyframes slideIn {
    from {
      transform: translateY(100px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
</style>
