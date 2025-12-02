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

  .input {
    width: 100%;
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-default);
    padding: var(--space-2_5) var(--space-3);
    background: var(--surface-input);
    color: var(--text-primary);
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

  .error {
    margin-top: var(--space-3);
    color: var(--danger-500, #f97373);
    font-size: 0.9rem;
  }

  .tableWrap {
    max-height: 420px;
    overflow: auto;
    margin-top: var(--space-4);
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
    width: 30%;
    font-weight: 600;
  }

  .note {
    margin-top: var(--space-4);
    font-size: 0.85rem;
    color: var(--text-muted);
  }
</style>
