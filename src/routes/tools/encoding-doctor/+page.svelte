<script>
  import { onMount } from 'svelte';

  let textInput = '';
  let files = [];
  let autoRepair = true;
  let smartPunctuation = true;
  let normalizeForm = 'NFC';

  let isLoading = false;
  let error = '';

  let originalText = '';
  let repairedText = '';
  let fileResults = [];

  function handleFileChange(event) {
    const target = event.currentTarget;
    const list = target?.files;
    files = list ? Array.from(list) : [];
  }

  function resetAll() {
    textInput = '';
    files = [];
    autoRepair = true;
    smartPunctuation = true;
    normalizeForm = 'NFC';
    error = '';
    originalText = '';
    repairedText = '';
    fileResults = [];
  }

  async function runRepair() {
    error = '';
    originalText = '';
    repairedText = '';
    fileResults = [];

    const trimmed = (textInput || '').trim();
    const hasText = trimmed.length > 0;
    const hasFiles = files && files.length > 0;

    if (!hasText && !hasFiles) {
      error = 'Paste some text or choose at least one file to repair.';
      return;
    }

    const formData = new FormData();
    if (hasText) {
      formData.append('text', trimmed);
      originalText = trimmed;
    }
    if (hasFiles) {
      for (const file of files) {
        formData.append('files', file);
      }
    }

    formData.append(
      'options',
      JSON.stringify({
        autoRepair,
        smartPunctuation,
        normalizeForm: normalizeForm === 'none' ? null : normalizeForm
      })
    );

    isLoading = true;
    try {
      const res = await fetch('/api/encoding-doctor', {
        method: 'POST',
        body: formData
      });

      let data = null;
      try {
        data = await res.json();
      } catch (e) {
        error = 'Unexpected response from Encoding Doctor API.';
        return;
      }

      if (!res.ok || data?.meta?.error || data?.ok === false) {
        const code = data?.meta?.error || data?.error || 'encoding_failed';
        if (code === 'text_too_large') {
          error = 'The pasted text is too large. Try a smaller excerpt or upload as a file.';
        } else if (code === 'blob_payload_too_large') {
          error = 'One of the uploaded files is too large to process.';
        } else if (code === 'disallowed_blob_host') {
          error = 'Remote file URLs must be hosted on TinyUtils or Vercel previews.';
        } else {
          error = 'Encoding repair failed. Please try again or reduce the input size.';
        }
        return;
      }

      if (typeof data.text === 'string') {
        repairedText = data.text;
        showToast('Text repair complete');
      }

      if (Array.isArray(data.files)) {
        fileResults = data.files.map((f) => ({
          name: f.name,
          preview: f.preview || '',
          content: f.content || ''
        }));
        showToast(`Repaired ${data.files.length} file${data.files.length !== 1 ? 's' : ''}`);
      }
    } catch (e) {
      error = 'Request failed. Check your connection and try again.';
    } finally {
      isLoading = false;
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

  function handleKeydown(event) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      void runRepair();
    }
  }

  function downloadFile(file) {
    const content = file.content || '';
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name || 'encoding-doctor-output.txt';
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

  async function downloadAll() {
    for (const file of fileResults) {
      downloadFile(file);
    }
  }

  onMount(() => {
    if (typeof document === 'undefined') return;
    const textarea = document.getElementById('textInput');
    if (textarea && 'focus' in textarea) {
      textarea.focus();
    }
  });
</script>

<svelte:window on:keydown={handleKeydown} />

<svelte:head>
  <title>Encoding Doctor — Fix mojibake &amp; encoding errors — TinyUtils</title>
  <meta
    name="description"
    content="Fix mojibake, broken accents, and smart punctuation glitches. Repair UTF-8 encoding errors instantly."
  />
  <meta name="robots" content="noindex" />
  <link rel="canonical" href="/tools/encoding-doctor/" />
</svelte:head>

<div class="tool-page">
  <section class="tool-hero">
    <span class="tool-hero-icon" aria-hidden="true">🩺</span>
    <h1>Encoding Doctor</h1>
    <p class="tool-hero-subtitle">
      Fix mojibake and encoding errors like "FranÃ§ois d'Arcy" → "François d'Arcy". Paste text or upload
      files to repair common UTF‑8 glitches.
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
        <label for="textInput" class="field-label">Paste broken text</label>
        <textarea
          id="textInput"
          class="textarea"
          rows="8"
          placeholder="Paste mojibake here, e.g. FranÃ§ois dâ€™Arcy — rÃ©sumÃ©."
          bind:value={textInput}
        ></textarea>
      </div>

      <div class="field-group">
        <label class="field-label" for="fileInput">Or upload files</label>
        <input
          id="fileInput"
          class="input"
          type="file"
          multiple
          on:change={handleFileChange}
        />
        <p class="hint">
          Works best with text‑friendly formats such as TXT, MD, HTML, DOCX, PDF, RTF, ODT and formats
          supported by the Document Converter.
        </p>

        <div class="options-grid">
          <label class="checkbox">
            <input type="checkbox" bind:checked={autoRepair} />
            <span>Auto‑repair mojibake</span>
          </label>
          <label class="checkbox">
            <input type="checkbox" bind:checked={smartPunctuation} />
            <span>Smart punctuation &amp; whitespace cleanup</span>
          </label>
          <div class="field-group">
            <label for="normalize" class="field-label">Unicode normalization</label>
            <select
              id="normalize"
              class="input"
              bind:value={normalizeForm}
            >
              <option value="NFC">NFC (default)</option>
              <option value="NFKC">NFKC</option>
              <option value="none">None</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <div class="actions-row">
      <button class="btn primary" type="button" on:click={runRepair} disabled={isLoading}>
        {isLoading ? 'Repairing…' : 'Repair'}
      </button>
      <button
        class="btn secondary"
        type="button"
        on:click={downloadAll}
        disabled={!fileResults.length}
      >
        Download all
      </button>
      <button class="btn ghost" type="button" on:click={resetAll}>
        Clear
      </button>
      <div class="hint">
        <kbd>Ctrl/⌘</kbd> + <kbd>Enter</kbd> to repair
      </div>
    </div>

    {#if error}
      <p class="error" role="alert">{error}</p>
    {/if}
  </section>

  {#if originalText || repairedText}
    <section class="card">
      <h2>Preview (pasted text)</h2>
      <div class="text-preview-grid">
        <div>
          <h3>Before</h3>
          <pre class="text-preview">{originalText || '(no text provided)'}</pre>
        </div>
        <div>
          <h3>After</h3>
          <pre class="text-preview">{repairedText || '(no repaired output yet)'}</pre>
        </div>
      </div>
    </section>
  {/if}

  {#if fileResults.length}
    <section class="card">
      <h2>Files</h2>
      <div class="tableWrap">
        <table class="results-table">
          <thead>
            <tr>
              <th>File</th>
              <th>Preview</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {#each fileResults as file}
              <tr>
                <td>{file.name}</td>
                <td>
                  <pre class="file-preview">{file.preview}</pre>
                </td>
                <td>
                  <button class="btn ghost small" type="button" on:click={() => downloadFile(file)}>
                    Download
                  </button>
                </td>
              </tr>
            {/each}
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

  .tool-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.3fr) minmax(0, 1.5fr);
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
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--space-4);
    margin-top: var(--space-4);
  }

  .checkbox {
    display: inline-flex;
    gap: var(--space-2);
    align-items: center;
    font-size: 0.9rem;
  }

  .hint {
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .actions-row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    align-items: center;
    margin-top: var(--space-4);
  }

  .error {
    margin-top: var(--space-3);
    color: var(--danger-500, #f97373);
    font-size: 0.9rem;
  }

  .text-preview-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: var(--space-4);
  }

  .text-preview {
    font-family: var(--font-mono);
    font-size: 0.85rem;
    white-space: pre-wrap;
    padding: var(--space-3);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-subtle);
    background: var(--surface-subtle);
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
    vertical-align: top;
  }

  .results-table th {
    position: sticky;
    top: 0;
    background: var(--surface-base);
    z-index: 1;
  }

  .file-preview {
    font-family: var(--font-mono);
    font-size: 0.8rem;
    white-space: pre-wrap;
    max-height: 9rem;
    overflow: hidden;
  }

  .btn.small {
    padding: 6px 12px;
    font-size: 0.85rem;
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

