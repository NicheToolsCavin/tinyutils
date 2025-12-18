<script>
  import { onMount } from 'svelte';

  let url = '';
  let isLoading = false;
  let error = '';
  let hasRun = false;
  let result = null;

  async function runPreview() {
    error = '';
    result = null;
    hasRun = false;

    const trimmed = (url || '').trim();
    if (!trimmed) {
      error = 'Please enter a URL to preview.';
      return;
    }

    isLoading = true;
    try {
      const res = await fetch('/api/metafetch', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: trimmed })
      });

      let data = null;
      try {
        data = await res.json();
      } catch (e) {
        error = 'Unexpected response from preview API.';
        return;
      }

      if (!res.ok || data?.error) {
        const code = data?.error || 'preview_failed';
        if (code === 'invalid_url') {
          error = 'That URL looks invalid. Try including https:// and a valid host.';
        } else {
          error = 'Preview failed. Please try again or test a different URL.';
        }
        return;
      }

      result = {
        requestedUrl: trimmed,
        title: data.title || '',
        description: data.description || '',
        meta: data.meta || null
      };
    } catch (e) {
      error = 'Request failed. Check your connection and try again.';
    } finally {
      isLoading = false;
      hasRun = true;
    }
  }

  function handleKeydown(event) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      void runPreview();
    }
  }

  onMount(() => {
    if (typeof document === 'undefined') return;
    const input = document.getElementById('url');
    if (input && 'focus' in input) {
      input.focus();
    }
  });
</script>

<svelte:window on:keydown={handleKeydown} />

<svelte:head>
  <title>Meta Tag Preview — TinyUtils</title>
  <meta
    name="description"
    content="Preview how your page title and description will appear when shared or listed in search results."
  />
  <meta name="robots" content="noindex" />
  <link rel="canonical" href="/tools/meta-preview/" />
</svelte:head>

<div class="tool-page">
  <section class="tool-hero">
    <span class="tool-hero-icon" aria-hidden="true">🔍</span>
    <h1>Meta Tag Preview</h1>
    <p class="tool-hero-subtitle">
      Preview how your page title and description will appear for crawlers and link previews.
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
      <label for="url" class="field-label">Page URL</label>
      <input
        id="url"
        class="input"
        type="url"
        placeholder="https://example.com/article"
        bind:value={url}
        data-testid="meta-url-input"
      />
    </div>

    <div class="actions-row">
      <button
        class="btn primary"
        type="button"
        data-testid="meta-preview-run"
        on:click={runPreview}
        disabled={isLoading}
      >
        {isLoading ? 'Fetching…' : 'Preview'}
      </button>
      <div class="hint">
        <kbd>Ctrl/⌘</kbd> + <kbd>Enter</kbd> to preview
      </div>
    </div>

    {#if error}
      <p class="error" role="alert">{error}</p>
    {/if}
  </section>

  {#if hasRun && result}
    <section class="card">
      <h2>Extracted meta</h2>
      <div class="tableWrap">
        <table class="results-table" data-testid="meta-results-table">
          <tbody>
            <tr>
              <th scope="row">Requested URL</th>
              <td>
                <a href={result.requestedUrl} target="_blank" rel="noopener">{result.requestedUrl}</a>
              </td>
            </tr>
            <tr>
              <th scope="row">Title</th>
              <td data-testid="meta-title-cell">{result.title || '—'}</td>
            </tr>
            <tr>
              <th scope="row">Description</th>
              <td>{result.description || '—'}</td>
            </tr>
            {#if result.meta?.requestId}
              <tr>
                <th scope="row">Request ID</th>
                <td>{result.meta.requestId}</td>
              </tr>
            {/if}
          </tbody>
        </table>
      </div>

      <p class="note">
        This preview currently focuses on the HTML <code>&lt;title&gt;</code> and <code>&lt;meta name="description"&gt;</code>
        tags. Open Graph and Twitter-specific tags will be surfaced in a future update.
      </p>
    </section>
  {:else if hasRun && !result && !error}
    <section class="card">
      <p>No meta tags were detected for this URL.</p>
    </section>
  {/if}
</div>

<style>
  /* ═══════════════════════════════════════════════════════════
     LIQUID GLASS META PREVIEW
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

  /* Glass input */
  .input {
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

  .input:focus {
    outline: none;
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
  }

  :global(html[data-theme="light"]) .input {
    background: rgba(255, 255, 255, 0.6);
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.06);
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

  .error {
    margin-top: var(--space-3);
    padding: var(--space-3);
    border-radius: var(--radius-lg);
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #f87171;
    font-size: 0.9rem;
    position: relative;
    z-index: 1;
  }

  /* Glass table */
  .tableWrap {
    max-height: 420px;
    overflow: auto;
    margin-top: var(--space-4);
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
    width: 30%;
    font-weight: var(--font-semibold);
    color: var(--text-primary);
    background: var(--glass-bg-hover);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }

  :global(html[data-theme="light"]) .results-table th {
    background: rgba(255, 255, 255, 0.8);
  }

  .results-table tbody tr:hover {
    background: var(--glass-bg-hover);
  }

  .results-table a {
    color: var(--accent-primary);
  }

  .results-table a:hover {
    text-decoration: underline;
  }

  .note {
    margin-top: var(--space-4);
    font-size: 0.85rem;
    color: var(--text-tertiary);
    position: relative;
    z-index: 1;
  }

  .note code {
    font-family: var(--font-mono);
    font-size: 0.8rem;
    padding: 2px 6px;
    border-radius: 4px;
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
  }
</style>
