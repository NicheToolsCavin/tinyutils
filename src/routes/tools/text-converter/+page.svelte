<script>
  import { onMount } from 'svelte';
  import { THEME_COLORS } from '$lib/theme/colors.js';

  const PREVIEW_PARSE_BUDGET_MS = 150;
  const PREVIEW_RENDER_BUDGET_MS = 750;
  const JSON_PREVIEW_NODE_LIMIT = 5000;

  const DEV_TELEMETRY_ENABLED =
    typeof import.meta !== 'undefined' &&
    import.meta.env &&
    (import.meta.env.DEV ||
      import.meta.env.MODE === 'development' ||
      import.meta.env.MODE === 'preview');

  function logPreviewEvent(event, details = {}) {
    if (!DEV_TELEMETRY_ENABLED) return;
    try {
      console.debug('[converter-preview]', event, details);
    } catch (e) {
      // Ignore logging failures
    }
  }

  function getPreviewThemeForIframe() {
    if (typeof document === 'undefined') {
      return {
        surface: '#1e1e1e',
        text: '#f9fafb',
        border: 'rgba(148, 163, 184, 0.4)'
      };
    }
    const root = document.documentElement;
    const styles = getComputedStyle(root);
    const surface = (styles.getPropertyValue('--surface-base') || '').trim() || '#1e1e1e';
    const text = (styles.getPropertyValue('--text-primary') || '').trim() || '#f9fafb';
    const border = (styles.getPropertyValue('--border-default') || '').trim() || 'rgba(148, 163, 184, 0.4)';
    return { surface, text, border };
  }

  /**
   * Get theme-aware RGBA colors for inline CSS in iframes.
   * Memoized to avoid re-computation on every render.
   * Uses shared THEME_COLORS constants from $lib/theme/colors.js
   *
   * @returns {Object} Color palette with tableBorder, tableBg, cellBorder, headerBg, preBg, preBorder
   */
  let cachedTheme = null;
  let cachedColors = null;

  function getThemeAwareColors() {
    try {
      // SSR fallback - use dark theme colors
      if (typeof document === 'undefined') {
        return THEME_COLORS.dark;
      }

      const theme = document.documentElement.getAttribute('data-theme') || 'dark';

      // Memoize: return cached colors if theme hasn't changed
      if (cachedTheme === theme && cachedColors) {
        return cachedColors;
      }

      cachedTheme = theme;
      cachedColors = THEME_COLORS[theme] || THEME_COLORS.dark;

      return cachedColors;
    } catch (err) {
      // Graceful fallback if theme detection fails
      console.error('Failed to get theme colors, falling back to dark theme:', err);
      logPreviewEvent('theme_colors_error_fallback', {
        message: String(err && err.message || err)
      });
      return THEME_COLORS.dark;
    }
  }

  /**
   * Watch for theme changes and invalidate cache when theme toggles.
   * This ensures previews update with correct colors when user switches themes.
   */
  onMount(() => {
    if (typeof document === 'undefined') return;

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName === 'data-theme') {
          // Theme changed - invalidate cache to force re-computation
          cachedTheme = null;
          cachedColors = null;
          logPreviewEvent('theme_change_cache_invalidated', {
            newTheme: document.documentElement.getAttribute('data-theme')
          });
          break;
        }
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    return () => observer.disconnect();
  });

  const DEMO_SNIPPET = [
    '# TinyUtils Demo Document',
    'This demo shows headings, links, inline code, and lists so you can preview conversions.',
    '## Sample content',
    '- Bullet lists stay clean.',
    '- Headings become outline anchors.',
    '- `Inline code` appears everywhere.',
    '```js',
    'const message = "Hello from TinyUtils";',
    'console.log(message);',
    '```',
    '## More context',
    'The converter keeps formatting, tables, and metadata intact.',
    '[TinyUtils tools hub](/tools/) leads back to the whole suite.'
  ].join('\n\n');

  onMount(() => {
    const textInput = document.getElementById('textInput');
    const fileInput = document.getElementById('fileInput');
    const toSingle = document.getElementById('toSingle');
    const advToggle = document.getElementById('advToggle');
    const multiTargets = document.getElementById('multiTargets');
    const toMd = document.getElementById('toMd');
    const toTxt = document.getElementById('toTxt');
    const toHtml = document.getElementById('toHtml');
    const toDocx = document.getElementById('toDocx');
    const toRtf = document.getElementById('toRtf');
    const toOdt = document.getElementById('toOdt');
    const toPdf = document.getElementById('toPdf');
    const toEpub = document.getElementById('toEpub');
    const customExt = document.getElementById('customExt');
    const mdDialectRow = document.getElementById('mdDialectRow');
    const mdDialectSel = document.getElementById('mdDialect');
    const fromSelect = document.getElementById('fromFormat');
    const optAcceptTracked = document.getElementById('optAcceptTracked');
    const optExtractMedia = document.getElementById('optExtractMedia');
    const optRemoveZW = document.getElementById('optRemoveZW');
    const pdfMarginPresetSel = document.getElementById('pdfMarginPreset');
    const pdfPageSizeSel = document.getElementById('pdfPageSize');
    const previewBtn = document.getElementById('previewBtn');
    const previewPanel = document.getElementById('previewPanel');
    const previewHeader = document.getElementById('previewHeader');
    const previewIframe = document.getElementById('previewIframe');
    const previewUnavailableCard = document.getElementById('previewUnavailableCard');
    const previewTooBigCard = document.getElementById('previewTooBigCard');
    const convertBtn = document.getElementById('convertBtn');
    const clearBtn = document.getElementById('clearBtn');
    const demoBtn = document.getElementById('demoBtn');
    const progressMessageEl = document.getElementById('progressMessage');
    const progressMeter = document.getElementById('progressMeter');
    const previewStatusBanner = document.getElementById('previewStatusBanner');
    const resultsBody = document.querySelector('#results tbody');

    let currentFile = null;
    let requestCounter = 0;
    let isBusy = false;

    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    function updateProgressState(message, value) {
      if (progressMessageEl) progressMessageEl.textContent = message;
      if (progressMeter) {
        if (value == null) {
          progressMeter.hidden = true;
        } else {
          progressMeter.hidden = false;
          progressMeter.value = Math.max(0, Math.min(100, value));
        }
      }
    }

    function setAdvanced(on) {
      if (!multiTargets || !advToggle) return;
      multiTargets.style.display = on ? '' : 'none';
      advToggle.setAttribute('aria-expanded', on ? 'true' : 'false');
    }

    function showToast(message) {
      const existing = document.querySelector('.toast');
      if (existing) existing.remove();
      const div = document.createElement('div');
      div.className = 'toast';
      div.textContent = message;
      document.body.appendChild(div);
      setTimeout(() => div.remove(), 4000);
    }

    function escapeHtml(value) {
      return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      })[ch]);
    }

    function setPreviewBanner(message, tone = 'info') {
      if (!previewStatusBanner) return;
      if (!message) {
        previewStatusBanner.textContent = '';
        previewStatusBanner.hidden = true;
        previewStatusBanner.classList.remove('preview-status--info', 'preview-status--warn');
        return;
      }
      previewStatusBanner.textContent = message;
      previewStatusBanner.hidden = false;
      previewStatusBanner.classList.remove('preview-status--info', 'preview-status--warn');
      previewStatusBanner.classList.add(tone === 'warn' ? 'preview-status--warn' : 'preview-status--info');
    }

    function sniffFormatFromContent(content) {
      if (!content || typeof content !== 'string') return null;
      const trimmed = content.trim();
      if (!trimmed) return null;

      // JSON-ish
      if (/^\s*[\[{]/.test(trimmed)) return 'json';

      const firstLines = trimmed.split(/\r?\n/).slice(0, 5);
      let commaLike = 0;
      let semiLike = 0;
      for (const line of firstLines) {
        if (/,/.test(line)) commaLike += 1;
        if (/;/.test(line)) semiLike += 1;
      }
      if (commaLike >= 2 || semiLike >= 2) return 'csv';

      if (/^#{1,6}\s/.test(firstLines[0] || '') || /^---\s*$/.test(firstLines[0] || '')) {
        return 'md';
      }

      if (/\\documentclass|\\begin\{document\}/.test(trimmed)) return 'tex';

      return null;
    }

    // Format-specific preview renderers

    function parseCsvContent(content, maxRows = 100) {
      // Minimal RFC 4180-style CSV parser for the *whole* content.
      // Supports:
      //   - quoted fields
      //   - commas inside quotes
      //   - doubled quotes inside quoted fields ("")
      //   - CRLF or LF line endings
      const rows = [];
      let row = [];
      let current = '';
      let inQuotes = false;

      const pushCell = () => {
        const trimmed = current.trim();
        let value = trimmed;
        if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
          // Strip surrounding quotes and collapse doubled quotes.
          value = trimmed.slice(1, -1).replace(/""/g, '"');
        }
        row.push(value);
        current = '';
      };

      const pushRow = () => {
        // Skip a completely empty row
        if (row.length === 1 && row[0] === '') {
          row = [];
          return;
        }
        rows.push(row);
        row = [];
      };

      for (let i = 0; i < content.length; i += 1) {
        const ch = content[i];
        if (ch === '"') {
          if (inQuotes && content[i + 1] === '"') {
            current += '"';
            i += 1;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (ch === ',' && !inQuotes) {
          pushCell();
        } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
          pushCell();
          pushRow();
          if (rows.length >= maxRows) break;
          // Consume paired CRLF
          if (ch === '\r' && content[i + 1] === '\n') {
            i += 1;
          }
        } else {
          current += ch;
        }
      }

      // Flush last cell/row
      if (current.length || row.length) {
        pushCell();
        pushRow();
      }

      return rows.slice(0, maxRows);
    }

    function renderCSVPreview(content) {
      if (!content || !previewIframe) return;
      try {
        const hasPerf = typeof performance !== 'undefined' && typeof performance.now === 'function';
        const start = hasPerf ? performance.now() : 0;

        const rows = parseCsvContent(content, 100);
        if (!rows.length) {
          previewIframe.srcdoc = '';
          return;
        }

        let parseMs = 0;
        if (hasPerf && start) {
          parseMs = performance.now() - start;
        }

        if (parseMs && parseMs > PREVIEW_PARSE_BUDGET_MS) {
          logPreviewEvent('csv_preview_parse_budget_exceeded', {
            parseMs,
            rowCount: rows.length
          });
          setPreviewBanner('Preview simplified to keep the page responsive; download for full detail.', 'warn');
          renderTextPreview(content);
          return;
        }

        const colors = getThemeAwareColors();

        // Build inline CSS for theme-aware table preview
        const tableStyles = `
          .tableWrap{max-height:480px;overflow:auto;border-radius:12px;border:1px solid ${colors.tableBorder}}
          table{border-collapse:collapse;width:100%;background:${colors.tableBg}}
          th,td{border:1px solid ${colors.cellBorder};padding:8px;text-align:left}
          th{background:${colors.headerBg};position:sticky;top:0;z-index:1;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
        `;

        let html = `<style>${tableStyles}</style><div class="tableWrap"><table>`;
        let renderBudgetHit = false;

        rows.forEach((cells, idx) => {
          if (!renderBudgetHit && hasPerf && start && PREVIEW_RENDER_BUDGET_MS > 0) {
            const elapsed = performance.now() - start;
            if (elapsed > PREVIEW_RENDER_BUDGET_MS) {
              renderBudgetHit = true;
              return;
            }
          }
          html += idx === 0 ? '<thead><tr>' : '<tr>';
          cells.forEach((cell) => {
            html += idx === 0 ? `<th scope="col">${escapeHtml(cell)}</th>` : `<td>${escapeHtml(cell)}</td>`;
          });
          html += idx === 0 ? '</tr></thead><tbody>' : '</tr>';
        });

        if (renderBudgetHit) {
          logPreviewEvent('csv_preview_render_budget_exceeded', {
            rowCount: rows.length
          });
          setPreviewBanner('Preview simplified to keep the page responsive; download for full detail.', 'warn');
          renderTextPreview(content);
          return;
        }

        html += '</tbody></table></div>';
        previewIframe.srcdoc = html;
      } catch (err) {
        console.error('converter: CSV preview failed, falling back to text', err);
        logPreviewEvent('csv_preview_error_fallback', { message: String(err && err.message || err) });
        setPreviewBanner('Preview simplified to keep the page responsive; download for full detail.', 'warn');
        renderTextPreview(content);
      }
    }

    function renderJSONPreview(content) {
      if (!content || !previewIframe) return;
      const MAX_JSON_PRETTY_CHARS = 200000; // avoid jank on very large JSON payloads
      const hasPerf = typeof performance !== 'undefined' && typeof performance.now === 'function';
      const start = hasPerf ? performance.now() : 0;

      if (content.length > MAX_JSON_PRETTY_CHARS) {
        // For very large JSON, fall back to the lightweight text preview
        // instead of pretty-printing on the main thread.
        logPreviewEvent('json_preview_size_budget_exceeded', {
          length: content.length,
          maxChars: MAX_JSON_PRETTY_CHARS
        });
        setPreviewBanner('Preview simplified to keep the page responsive; download for full detail.', 'warn');
        renderTextPreview(content);
        return;
      }
      try {
        const parsed = JSON.parse(content);
        let parseMs = 0;
        if (hasPerf && start) {
          parseMs = performance.now() - start;
        }
        if (parseMs && parseMs > PREVIEW_PARSE_BUDGET_MS) {
          logPreviewEvent('json_preview_parse_budget_exceeded', { parseMs });
          setPreviewBanner('Preview simplified to keep the page responsive; download for full detail.', 'warn');
          renderTextPreview(content);
          return;
        }

        const formatted = JSON.stringify(parsed, null, 2);

        const beforeRender = hasPerf && start ? performance.now() : 0;
        const theme = getPreviewThemeForIframe();
        const html = `
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css" integrity="sha512-vswe+cgvic/XBoF1OcM/TeJ2FW0OofqAVdCZiEYkd6dwGXthvkSFWOoGGJgS2CW70VK5dQM5Oh+7ne47s74VTg==" crossorigin="anonymous" referrerpolicy="no-referrer" />
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js" integrity="sha512-7Z9J3l1+EYfeaPKcGXu3MS/7T+w19WtKQY/n+xzmw4hZhJ9tyYmcUS+4QqAlzhicE5LAfMQSF3iFTK9bQdTxXg==" crossorigin="anonymous" referrerpolicy="no-referrer"><\/script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/autoloader/prism-autoloader.min.js" integrity="sha512-SkmBfuA2hqjzEVpmnMt/LINrjop3GKWqsuLSSB3e7iBmYK7JuWw4ldmmxwD9mdm2IRTTi0OxSAfEGvgEi0i2Kw==" crossorigin="anonymous" referrerpolicy="no-referrer"><\/script>
<style>
body{margin:0;padding:1rem;background:${theme.surface};color:${theme.text};}
.preview-shell{position:relative;}
pre{margin:0;border-radius:0.5rem;border:1px solid ${theme.border};overflow:auto;}
.copy-btn{position:absolute;top:0.5rem;right:0.5rem;font-size:12px;padding:0.2rem 0.6rem;border-radius:999px;border:1px solid ${theme.border};background:rgba(0,0,0,0.05);color:${theme.text};cursor:pointer;}
.copy-btn[data-state="copied"]{background:${theme.border};}
</style>
<div class="preview-shell">
  <button class="copy-btn" type="button" data-state="idle">Copy</button>
  <pre><code class="language-json">${escapeHtml(formatted)}</code></pre>
</div>
<script>
if (window.Prism && Prism.plugins && Prism.plugins.autoloader) {
  Prism.plugins.autoloader.languages_path = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/';
}
Prism.highlightAll();
(function(){
  const btn = document.querySelector('.copy-btn');
  const code = document.querySelector('pre code');
  if (!btn || !code || !navigator.clipboard) return;
  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(code.innerText || '');
      btn.dataset.state = 'copied';
      btn.textContent = 'Copied!';
      setTimeout(() => {
        btn.dataset.state = 'idle';
        btn.textContent = 'Copy';
      }, 1500);
    } catch (err) {
      console.error('copy failed', err);
    }
  });
})();
<\/script>`;
        if (hasPerf && beforeRender) {
          const renderMs = performance.now() - beforeRender;
          if (renderMs > PREVIEW_RENDER_BUDGET_MS) {
            logPreviewEvent('json_preview_render_budget_exceeded', { renderMs });
            setPreviewBanner('Preview simplified to keep the page responsive; download for full detail.', 'warn');
            renderTextPreview(content);
            return;
          }
        }

        previewIframe.srcdoc = html;
      } catch (e) {
        logPreviewEvent('json_preview_parse_error', { message: String(e && e.message || e) });
        setPreviewBanner('Preview can\'t parse JSON; showing raw text instead.', 'warn');
        renderTextPreview(content);
      }
    }

    function renderMarkdownPreview(content) {
      if (!content || !previewIframe) return;
      const hasPerf = typeof performance !== 'undefined' && typeof performance.now === 'function';
      const start = hasPerf ? performance.now() : 0;
      // Simple side-by-side view: left shows syntax-highlighted markdown, right shows formatted text
      const escaped = escapeHtml(content);
      const formatted = escaped.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');
      const beforeRender = hasPerf && start ? performance.now() : 0;
      const theme = getPreviewThemeForIframe();
      const html = `
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism.min.css" integrity="sha512-tN7Ec6zAFaVSG3TpNAKtk4DOHNpSwKHxxrsiw4GHKESGPs5njn/0sMCUMl2svV4wo4BK/rCP7juYz+zx+l6oeQ==" crossorigin="anonymous" referrerpolicy="no-referrer" />
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js" integrity="sha512-7Z9J3l1+EYfeaPKcGXu3MS/7T+w19WtKQY/n+xzmw4hZhJ9tyYmcUS+4QqAlzhicE5LAfMQSF3iFTK9bQdTxXg==" crossorigin="anonymous" referrerpolicy="no-referrer"><\/script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/autoloader/prism-autoloader.min.js" integrity="sha512-SkmBfuA2hqjzEVpmnMt/LINrjop3GKWqsuLSSB3e7iBmYK7JuWw4ldmmxwD9mdm2IRTTi0OxSAfEGvgEi0i2Kw==" crossorigin="anonymous" referrerpolicy="no-referrer"><\/script>
<style>
body{margin:0;padding:1rem;background:${theme.surface};color:${theme.text};}
.md-container{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
.md-src,.md-formatted{border:1px solid ${theme.border};padding:1rem;overflow:auto;max-height:600px;border-radius:0.75rem;background:rgba(0,0,0,0.02)}
.md-src{position:relative;}
.md-src pre{margin:0;background:transparent}
.md-formatted{background:${theme.surface};}
.copy-btn{position:absolute;top:0.5rem;right:0.5rem;font-size:12px;padding:0.2rem 0.6rem;border-radius:999px;border:1px solid ${theme.border};background:rgba(0,0,0,0.05);color:${theme.text};cursor:pointer;}
.copy-btn[data-state="copied"]{background:${theme.border};}
h1,h2,h3,h4,h5,h6{margin:0.5rem 0}
code{background:rgba(0,0,0,0.06);padding:2px 4px;border-radius:3px}
@media (max-width: 768px){.md-container{grid-template-columns:1fr;}}
</style>
<div class="md-container">
  <div>
    <b>Markdown Source</b>
    <div class="md-src">
      <button class="copy-btn" type="button" data-state="idle">Copy</button>
      <pre><code class="language-markdown">${escaped}</code></pre>
    </div>
  </div>
  <div><b>Plain Text View</b><div class="md-formatted"><p>${formatted}</p></div></div>
</div>
<script>
if (window.Prism && Prism.plugins && Prism.plugins.autoloader) {
  Prism.plugins.autoloader.languages_path = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/';
}
Prism.highlightAll();
(function(){
  const btn = document.querySelector('.copy-btn');
  const code = document.querySelector('.md-src code');
  if (!btn || !code || !navigator.clipboard) return;
  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(code.innerText || '');
      btn.dataset.state = 'copied';
      btn.textContent = 'Copied!';
      setTimeout(() => {
        btn.dataset.state = 'idle';
        btn.textContent = 'Copy';
      }, 1500);
    } catch (err) {
      console.error('copy failed', err);
    }
  });
})();
<\/script>`;
      try {
        if (hasPerf && beforeRender) {
          const renderMs = performance.now() - beforeRender;
          if (renderMs > PREVIEW_RENDER_BUDGET_MS) {
            logPreviewEvent('markdown_preview_render_budget_exceeded', { renderMs });
            setPreviewBanner('Preview simplified to keep the page responsive; download for full detail.', 'warn');
            renderTextPreview(content);
            return;
          }
        }
        previewIframe.srcdoc = html;
      } catch (err) {
        console.error('converter: Markdown preview failed, falling back to text', err);
        logPreviewEvent('markdown_preview_error_fallback', { message: String(err && err.message || err) });
        setPreviewBanner('Preview simplified to keep the page responsive; download for full detail.', 'warn');
        renderTextPreview(content);
      }
    }

    function renderTextPreview(content) {
      if (!content || !previewIframe) return;
      const hasPerf = typeof performance !== 'undefined' && typeof performance.now === 'function';
      const start = hasPerf ? performance.now() : 0;
      const lines = content.split('\n');
      const numbered = lines.map((l, i) => `${String(i + 1).padStart(4, ' ')} | ${escapeHtml(l)}`).join('\n');
      const colors = getThemeAwareColors();

      // Build inline CSS for theme-aware text preview
      const preStyles = `pre{background:${colors.preBg};padding:1rem;font-family:monospace;overflow:auto;border-radius:8px;border:1px solid ${colors.preBorder}}`;
      const html = `<style>${preStyles}</style><pre>${numbered}</pre>`;

      if (hasPerf && start) {
        const renderMs = performance.now() - start;
        if (renderMs > PREVIEW_RENDER_BUDGET_MS) {
          logPreviewEvent('text_preview_render_budget_exceeded', { renderMs, lineCount: lines.length });
          setPreviewBanner('Preview simplified to keep the page responsive; download for full detail.', 'warn');
        }
      }
      previewIframe.srcdoc = html;
    }

    function renderTeXPreview(content) {
      if (!content || !previewIframe) return;
      const hasPerf = typeof performance !== 'undefined' && typeof performance.now === 'function';
      const beforeRender = hasPerf ? performance.now() : 0;
      const theme = getPreviewThemeForIframe();
      const html = `
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css" integrity="sha512-vswe+cgvic/XBoF1OcM/TeJ2FW0OofqAVdCZiEYkd6dwGXthvkSFWOoGGJgS2CW70VK5dQM5Oh+7ne47s74VTg==" crossorigin="anonymous" referrerpolicy="no-referrer" />
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js" integrity="sha512-7Z9J3l1+EYfeaPKcGXu3MS/7T+w19WtKQY/n+xzmw4hZhJ9tyYmcUS+4QqAlzhicE5LAfMQSF3iFTK9bQdTxXg==" crossorigin="anonymous" referrerpolicy="no-referrer"><\/script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/autoloader/prism-autoloader.min.js" integrity="sha512-SkmBfuA2hqjzEVpmnMt/LINrjop3GKWqsuLSSB3e7iBmYK7JuWw4ldmmxwD9mdm2IRTTi0OxSAfEGvgEi0i2Kw==" crossorigin="anonymous" referrerpolicy="no-referrer"><\/script>
<style>
body{margin:0;padding:1rem;background:${theme.surface};color:${theme.text};}
.preview-shell{position:relative;}
pre{margin:0;border-radius:0.5rem;border:1px solid ${theme.border};overflow:auto;}
.copy-btn{position:absolute;top:0.5rem;right:0.5rem;font-size:12px;padding:0.2rem 0.6rem;border-radius:999px;border:1px solid ${theme.border};background:rgba(0,0,0,0.05);color:${theme.text};cursor:pointer;}
.copy-btn[data-state="copied"]{background:${theme.border};}
</style>
<div class="preview-shell">
  <button class="copy-btn" type="button" data-state="idle">Copy</button>
  <pre><code class="language-latex">${escapeHtml(content)}</code></pre>
</div>
<script>
if (window.Prism && Prism.plugins && Prism.plugins.autoloader) {
  Prism.plugins.autoloader.languages_path = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/';
}
Prism.highlightAll();
(function(){
  const btn = document.querySelector('.copy-btn');
  const code = document.querySelector('pre code');
  if (!btn || !code || !navigator.clipboard) return;
  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(code.innerText || '');
      btn.dataset.state = 'copied';
      btn.textContent = 'Copied!';
      setTimeout(() => {
        btn.dataset.state = 'idle';
        btn.textContent = 'Copy';
      }, 1500);
    } catch (err) {
      console.error('copy failed', err);
    }
  });
})();
<\/script>`;
      try {
        if (hasPerf && beforeRender) {
          const renderMs = performance.now() - beforeRender;
          if (renderMs > PREVIEW_RENDER_BUDGET_MS) {
            logPreviewEvent('tex_preview_render_budget_exceeded', { renderMs });
            setPreviewBanner('TeX preview simplified to source-only view. Download for full document.', 'warn');
            renderTextPreview(content);
            return;
          }
        }
        previewIframe.srcdoc = html;
      } catch (err) {
        console.error('converter: TeX preview failed, falling back to text', err);
        logPreviewEvent('tex_preview_error_fallback', { message: String(err && err.message || err) });
        setPreviewBanner('TeX preview simplified to source-only view. Download for full document.', 'warn');
        renderTextPreview(content);
      }
    }

    function formatBytes(bytes) {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    function extOf(name) {
      const n = String(name || '').toLowerCase();
      const i = n.lastIndexOf('.');
      return i >= 0 ? n.slice(i + 1) : '';
    }

    function isBinaryExt(ext) {
      return ['pdf', 'docx', 'odt', 'rtf', 'zip', 'epub'].includes(String(ext || '').toLowerCase());
    }

    function inferFormat(filename) {
      const ext = filename.toLowerCase().split('.').pop();
      if (ext === 'md' || ext === 'markdown') return 'markdown';
      if (ext === 'txt') return 'text';
      if (ext === 'htm' || ext === 'html') return 'html';
      if (ext === 'tex') return 'latex';
      if (ext === 'pdf') return 'pdf';
      if (ext === 'epub') return 'epub';
      if (ext === 'docx') return 'docx';
      if (ext === 'odt') return 'odt';
      if (ext === 'rtf') return 'rtf';
      return 'markdown';
    }

    function isPdfInputActive() {
      const hasFile = !!currentFile && extOf(currentFile.name) === 'pdf';
      const fromVal = fromSelect ? fromSelect.value : '';
      return hasFile || fromVal === 'pdf';
    }

    function summarizePdfMeta(data) {
      if (!data || !Array.isArray(data.logs)) return '';
      const metrics = { pages: null, headings: null, lists: null, tablesMd: null, tablesCsv: null, images: null, degraded: null };
      data.logs.forEach((log) => {
        if (typeof log !== 'string') return;
        let m;
        if ((m = log.match(/^pdf_pages=(\d+)/))) metrics.pages = Number(m[1]);
        else if ((m = log.match(/^pdf_headings=(\d+)/))) metrics.headings = Number(m[1]);
        else if ((m = log.match(/^pdf_lists=(\d+)/))) metrics.lists = Number(m[1]);
        else if ((m = log.match(/^pdf_tables_md=(\d+)/))) metrics.tablesMd = Number(m[1]);
        else if ((m = log.match(/^pdf_tables_csv=(\d+)/))) metrics.tablesCsv = Number(m[1]);
        else if ((m = log.match(/^pdf_images_placeholders=(\d+)/))) metrics.images = Number(m[1]);
        else if ((m = log.match(/^pdf_degraded=(.+)$/))) metrics.degraded = m[1].trim();
      });

      const parts = [];
      if (metrics.pages != null) parts.push(`${metrics.pages} page${metrics.pages === 1 ? '' : 's'}`);
      if (metrics.headings != null) parts.push(`${metrics.headings} heading${metrics.headings === 1 ? '' : 's'}`);
      if (metrics.lists != null) parts.push(`${metrics.lists} list${metrics.lists === 1 ? '' : 's'}`);
      if (metrics.tablesMd != null || metrics.tablesCsv != null) {
        const md = metrics.tablesMd || 0;
        const csv = metrics.tablesCsv || 0;
        parts.push(`${md} table${md === 1 ? '' : 's'} (Markdown)${csv ? `, ${csv} as CSV` : ''}`);
      }
      if (metrics.images != null) parts.push(`${metrics.images} image placeholder${metrics.images === 1 ? '' : 's'}`);

      let summary = '';
      if (parts.length) summary = ` Parsed: ${parts.join(', ')}.`;
      if (metrics.degraded) summary += ` Note: extractor marked this PDF as degraded (${metrics.degraded}); a simpler fallback may have been used.`;
      return summary;
    }

    async function createDataUrl(content, filename) {
      const blob = new Blob([content], { type: 'text/plain' });
      const reader = new FileReader();
      return new Promise((resolve, reject) => {
        reader.onloadend = () => resolve({ blobUrl: reader.result, name: filename });
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }

    async function createDataUrlFromFile(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve({ blobUrl: reader.result, name: file.name });
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    function updateOptionAvailability() {
      const fromFormat = fromSelect ? fromSelect.value : 'auto';
      const isWordLike = fromFormat === 'docx' || fromFormat === 'odt' || fromFormat === 'rtf';

      if (optAcceptTracked && optAcceptTracked.parentElement) {
        optAcceptTracked.disabled = !isWordLike;
        optAcceptTracked.parentElement.style.opacity = isWordLike ? '1' : '0.5';
        optAcceptTracked.checked = isWordLike ? !!optAcceptTracked.checked : false;
      }

      const hasEmbeddedMedia = isWordLike || fromFormat === 'html';
      const singleOut = toSingle ? toSingle.value : 'md';
      const hasMediaCapableOutput = ['md', 'html', 'docx', 'odt', 'epub'].includes(singleOut) || (toMd?.checked) || (toHtml?.checked) || (toDocx?.checked) || (toOdt?.checked) || (toEpub?.checked);
      const extractMediaApplicable = hasEmbeddedMedia && hasMediaCapableOutput;

      if (optExtractMedia && optExtractMedia.parentElement) {
        optExtractMedia.disabled = !extractMediaApplicable;
        optExtractMedia.parentElement.style.opacity = extractMediaApplicable ? '1' : '0.5';
        if (!extractMediaApplicable) optExtractMedia.checked = false;
        if (!hasEmbeddedMedia) {
          optExtractMedia.parentElement.title = 'Extract media only available for documents with embedded images (DOCX, ODT, RTF, HTML)';
        } else if (!hasMediaCapableOutput) {
          optExtractMedia.parentElement.title = 'Extract media requires at least one media-capable output (Markdown, HTML, DOCX)';
        } else {
          optExtractMedia.parentElement.title = 'Extract embedded images/media when available';
        }
      }

      const mdOn = (toSingle && toSingle.value === 'md') || !!(toMd && toMd.checked);
      if (mdDialectSel && mdDialectRow) {
        mdDialectSel.disabled = !mdOn;
        mdDialectRow.style.opacity = mdOn ? '1' : '0.5';
      }
    }

    function restorePrefs() {
      if (!window.TinyUtilsStorage) return;
      const prefs = window.TinyUtilsStorage.loadPrefs('converter');
      if (!prefs || typeof prefs !== 'object') return;
      if (prefs.toSingle && toSingle) toSingle.value = prefs.toSingle;
      if (typeof prefs.advanced === 'boolean') setAdvanced(prefs.advanced);
      if (prefs.mdDialect && mdDialectSel) mdDialectSel.value = prefs.mdDialect;
      if (typeof prefs.fromFormat === 'string' && fromSelect) fromSelect.value = prefs.fromFormat;
      if (typeof prefs.optAcceptTracked === 'boolean' && optAcceptTracked) optAcceptTracked.checked = prefs.optAcceptTracked;
      if (typeof prefs.optExtractMedia === 'boolean' && optExtractMedia) optExtractMedia.checked = prefs.optExtractMedia;
      if (typeof prefs.optRemoveZW === 'boolean' && optRemoveZW) optRemoveZW.checked = prefs.optRemoveZW;
      if (prefs.customExt && customExt) customExt.value = prefs.customExt;
      if (prefs.pdfMarginPreset && pdfMarginPresetSel) pdfMarginPresetSel.value = prefs.pdfMarginPreset;
      if (prefs.pdfPageSize && pdfPageSizeSel) pdfPageSizeSel.value = prefs.pdfPageSize;
    }

    function persistPrefs() {
      if (!window.TinyUtilsStorage) return;
      const prefs = {
        toSingle: toSingle ? toSingle.value : 'md',
        advanced: multiTargets ? multiTargets.style.display === '' : false,
        mdDialect: mdDialectSel ? mdDialectSel.value : '',
        fromFormat: fromSelect ? fromSelect.value : 'auto',
        optAcceptTracked: optAcceptTracked ? !!optAcceptTracked.checked : true,
        optExtractMedia: optExtractMedia ? !!optExtractMedia.checked : false,
        optRemoveZW: optRemoveZW ? !!optRemoveZW.checked : true,
        customExt: customExt ? customExt.value : '',
        pdfMarginPreset: pdfMarginPresetSel ? pdfMarginPresetSel.value : '',
        pdfPageSize: pdfPageSizeSel ? pdfPageSizeSel.value : '',
      };
      window.TinyUtilsStorage.savePrefs('converter', prefs);
    }

    function loadTryExample() {
      if (!textInput) return;
      textInput.value = DEMO_SNIPPET;
      if (fileInput) fileInput.value = '';
      currentFile = null;
      if (fromSelect) fromSelect.value = 'markdown';
      if (toSingle) toSingle.value = 'html';
      setAdvanced(false);
      updateOptionAvailability();
      if (previewPanel) previewPanel.style.display = 'none';
      if (resultsBody) resultsBody.innerHTML = '';
      updateProgressState('Demo content loaded. Click Convert to process.', 0);
      showToast('Try example content loaded.');
    }

    fileInput?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        currentFile = file;
        const ext = extOf(file.name);
        if (isBinaryExt(ext)) {
          showToast('File selected: ' + file.name);
        } else {
          const content = await file.text();
          if (textInput) textInput.value = content;
          showToast('File loaded: ' + file.name);
        }
      } catch (err) {
        showToast('Failed to read file: ' + err.message);
      }
    });

    async function runConvert({ previewOnly = false } = {}) {
      const content = textInput ? textInput.value.trim() : '';
      if (!content && !currentFile) {
        showToast('Please enter or upload some content first.');
        return;
      }

      const selectedFormats = [];
      const advancedOn = multiTargets && multiTargets.style.display === '';
      if (advancedOn) {
        if (toMd?.checked) selectedFormats.push('md');
        if (toTxt?.checked) selectedFormats.push('txt');
        if (toHtml?.checked) selectedFormats.push('html');
        if (toDocx?.checked) selectedFormats.push('docx');
        if (toOdt?.checked) selectedFormats.push('odt');
        if (toRtf?.checked) selectedFormats.push('rtf');
        if (toPdf?.checked) selectedFormats.push('pdf');
        if (toEpub?.checked) selectedFormats.push('epub');
      } else if (toSingle) {
        selectedFormats.push(toSingle.value);
      }

      if (selectedFormats.length === 0) {
        showToast('Please select at least one output format.');
        return;
      }

      convertBtn.disabled = true;
      previewBtn.disabled = true;
      isBusy = true;
      const isPdfInput = isPdfInputActive();
      const initialMessage = previewOnly
        ? (isPdfInput ? 'Parsing PDF for preview…' : 'Generating preview…')
        : (isPdfInput ? 'Parsing PDF…' : 'Converting…');
      updateProgressState(initialMessage, previewOnly ? 40 : 20);
      if (resultsBody) resultsBody.innerHTML = '';
      if (previewPanel) previewPanel.style.display = 'none';
      setPreviewBanner('', 'info');

      const thisRequest = ++requestCounter;

      try {
        const filename = currentFile ? currentFile.name : 'input.md';
        const ext = extOf(filename);
        const initialFromFormat = fromSelect ? fromSelect.value : 'auto';
        let fromFormat = initialFromFormat;
        if (fromFormat === 'auto') {
          const looksLikeLatex = /\\documentclass\b|\\begin\{document\}|\\section\{|\\usepackage\b/.test(content);
          fromFormat = looksLikeLatex ? 'latex' : inferFormat(filename);
        }
        if (currentFile && isBinaryExt(ext)) {
          if (ext === 'pdf') fromFormat = 'pdf';
          if (ext === 'docx') fromFormat = 'docx';
          if (ext === 'odt') fromFormat = 'odt';
          if (ext === 'rtf') fromFormat = 'rtf';
        }

        const input = currentFile && isBinaryExt(ext)
          ? await createDataUrlFromFile(currentFile)
          : await createDataUrl(content, filename);

        const hasMd = selectedFormats.includes('md');
        const dialectValue = mdDialectSel ? mdDialectSel.value : null;
        const pdfMarginPreset = pdfMarginPresetSel ? pdfMarginPresetSel.value : null;
        const pdfPageSize = pdfPageSizeSel ? pdfPageSizeSel.value : null;

          const payload = {
            inputs: [input],
            from: fromFormat,
            to: selectedFormats,
            options: {
              acceptTrackedChanges: !!optAcceptTracked?.checked,
              extractMedia: !!optExtractMedia?.checked,
              removeZeroWidth: !!optRemoveZW?.checked,
              mdDialect: hasMd && dialectValue ? dialectValue : undefined,
              pdfMarginPreset: selectedFormats.includes('pdf') && pdfMarginPreset ? pdfMarginPreset : undefined,
              pdfPageSize: selectedFormats.includes('pdf') && pdfPageSize ? pdfPageSize : undefined
            },
            preview: previewOnly ? true : undefined
          };

        async function sendOnce() {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 90000);
          try {
            return await fetch('/api/convert', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify(payload),
              signal: controller.signal
            });
          } finally {
            clearTimeout(timeoutId);
          }
        }

        let response;
        try {
          response = await sendOnce();
        } catch (err) {
          if (err && err.name === 'AbortError') {
            updateProgressState('Timed out, retrying…', 45);
            await new Promise((r) => setTimeout(r, 50 + Math.random() * 100));
            response = await sendOnce();
          } else {
            throw err;
          }
        }

        const contentType = response.headers.get('content-type') || '';
        let data;
        if (contentType.includes('application/json')) data = await response.json();
        else {
          const text = await response.text();
          throw new Error(text || `Non-JSON response (${response.status})`);
        }

        function mapConvertErrorFromResponse(status, dataObj) {
          if (!dataObj || typeof dataObj !== 'object') {
            return { type: 'Conversion error', message: `Conversion failed (${status})` };
          }
          const detail = dataObj.detail || dataObj.errorMessage || dataObj.message || '';
          const lowerDetail = String(detail).toLowerCase();
          if (lowerDetail.includes('no supported files found in zip archive')) {
            return { type: 'No convertible files in ZIP', message: 'We could not find any supported documents in that ZIP. Add DOCX, ODT, RTF, Markdown, TXT, or HTML files and try again.' };
          }
          if (lowerDetail.includes('invalid zip file')) {
            return { type: 'Invalid ZIP file', message: 'That ZIP file looks invalid or corrupted. Please recreate it and upload a fresh copy.' };
          }
          if (lowerDetail.includes('zip extraction failed')) {
            return { type: 'ZIP extraction error', message: 'We could not unpack that ZIP. Check that it is a valid archive and try again.' };
          }
          if (lowerDetail.includes('file exceeds max_file_mb')) {
            return { type: 'File too large', message: 'This file is too large for the online converter. Try a smaller document or split it into parts.' };
          }
          const errorsArr = Array.isArray(dataObj.errors) ? dataObj.errors : [];
          if (errorsArr.length) {
            const primary = errorsArr[0] || {};
            const kind = String(primary.kind || '').toLowerCase();
            const msg = String(primary.message || 'Conversion failed');
            if (kind === 'jobtoolargeerror' || msg.toLowerCase().includes('file exceeds max_file_mb')) {
              return { type: 'File too large', message: 'This file is too large for the online converter. Try a smaller excerpt or compress the content.' };
            }
            if (kind === 'pandocerror' || msg.toLowerCase().includes('pandoc')) {
              return { type: 'Document format issue', message: 'We had trouble reading this document. Try opening it in Word/LibreOffice and re-saving, then upload the new copy.' };
            }
            return { type: primary.kind || 'Conversion error', message: primary.message || 'Conversion failed.' };
          }
          if (detail) return { type: 'Conversion error', message: detail };
          return { type: 'Conversion error', message: `Conversion failed (${status})` };
        }

        if (!response.ok) {
          const mapped = mapConvertErrorFromResponse(response.status, data);
          throw new Error(`${mapped.type}: ${mapped.message}`);
        }

        const errorsArr = Array.isArray(data.errors) ? data.errors : [];
        if (!data.outputs || data.outputs.length === 0) {
          if (errorsArr.length) {
            const mapped = mapConvertErrorFromResponse(response.status, data);
            throw new Error(mapped.message);
          }
          throw new Error('The converter did not produce any outputs. Make sure the file contains supported text or documents.');
        }

        if (thisRequest !== requestCounter) return; // stale

        if (previewOnly && data.preview) {
          if (previewPanel) previewPanel.style.display = '';

          // Reset cards/iframe visibility
          if (previewUnavailableCard) previewUnavailableCard.style.display = 'none';
          if (previewTooBigCard) previewTooBigCard.style.display = 'none';

          const previewFlags = data.preview || {};
          const meta = data.meta || {};
          const isTooBig = previewFlags.tooBigForPreview || meta.fileTooLargeForPreview;

          if (isTooBig) {
            if (previewTooBigCard) previewTooBigCard.style.display = '';
            if (previewIframe) previewIframe.srcdoc = '';
            setPreviewBanner('This file is too large for a full inline preview, but the complete converted file is ready to download below.', 'info');
          } else {
            // Format-specific preview routing
            // Get output format from first output (for binary formats like PDF) or from preview flags
            const outputFormat = data.outputs && data.outputs.length > 0
              ? (data.outputs[0].target || data.outputs[0].format || data.outputs[0].to || '').toLowerCase()
              : '';
            const rawFormat = outputFormat || (previewFlags.format || 'html').toLowerCase();
            const content = previewFlags.content;
            const html = previewFlags.html;

            let effectiveFormat = rawFormat;

            if (content) {
              const sniffed = sniffFormatFromContent(content);
              const canOverride = !rawFormat || rawFormat === 'txt' || rawFormat === 'text' || rawFormat === 'md' || rawFormat === 'markdown';
              if (sniffed && sniffed !== rawFormat && canOverride) {
                effectiveFormat = sniffed;
                const labelFrom = rawFormat ? rawFormat.toUpperCase() : 'UNKNOWN';
                const labelTo = sniffed.toUpperCase();
                setPreviewBanner(`Format looks like ${labelTo} but marked as ${labelFrom}; previewing as ${labelTo}.`, 'info');
                logPreviewEvent('preview_format_sniff_disagreement', {
                  rawFormat,
                  sniffed
                });
              }
            }

            if (!previewStatusBanner?.textContent && (previewFlags.truncated || previewFlags.hasMoreRows || previewFlags.hasMoreNodes)) {
              const totalRows = typeof previewFlags.row_count === 'number' ? previewFlags.row_count : null;
              const totalNodes = typeof previewFlags.jsonNodeCount === 'number' ? previewFlags.jsonNodeCount : null;

              let msg = 'Preview truncated for large content to keep the page responsive. Download the file below to see everything.';
              if (previewFlags.hasMoreRows && !previewFlags.hasMoreNodes) {
                const shownRows = 100;
                if (totalRows && totalRows > shownRows) {
                  msg = `Preview truncated after the first ${shownRows} rows out of approximately ${totalRows}. Download file to see all rows.`;
                } else {
                  msg = 'Only part of the table is shown in the preview. Download to see all rows.';
                }
              } else if (previewFlags.hasMoreNodes && !previewFlags.hasMoreRows) {
                if (totalNodes && totalNodes > JSON_PREVIEW_NODE_LIMIT) {
                  const approxTotal = totalNodes.toLocaleString();
                  const approxLimit = JSON_PREVIEW_NODE_LIMIT.toLocaleString();
                  msg = `Preview truncated after about ${approxLimit} JSON nodes out of approximately ${approxTotal}. Download file to see the full structure.`;
                } else {
                  msg = 'JSON preview simplified to keep the page responsive. Download for the full structure.';
                }
              }

              setPreviewBanner(msg, 'info');
              logPreviewEvent('preview_truncated_meta', {
                truncated: !!previewFlags.truncated,
                hasMoreRows: !!previewFlags.hasMoreRows,
                hasMoreNodes: !!previewFlags.hasMoreNodes,
                row_count: totalRows,
                jsonNodeCount: totalNodes
              });
            }

            const format = effectiveFormat;

            if (previewHeader) {
              let label = 'Preview';
              switch (format) {
                case 'csv':
                  label = 'CSV preview (first ~100 rows)';
                  break;
                case 'json':
                  label = 'JSON preview';
                  break;
                case 'md':
                case 'markdown':
                  label = 'Markdown preview';
                  break;
                case 'txt':
                case 'text':
                  label = 'Text preview';
                  break;
                case 'tex':
                case 'latex':
                  label = 'TeX preview';
                  break;
                case 'pdf':
                  label = 'PDF output';
                  break;
                default:
                  label = 'Preview';
              }
              previewHeader.textContent = label;
              previewHeader.setAttribute('aria-label', `${label} – inline document preview`);
            }

            // Handle PDF format separately (binary format, no text content)
            if (format === 'pdf') {
              if (previewUnavailableCard) previewUnavailableCard.style.display = 'none';
              if (previewTooBigCard) previewTooBigCard.style.display = 'none';
              if (previewIframe) {
                const theme = getPreviewThemeForIframe();
                previewIframe.srcdoc = `
                  <style>
                    body { margin: 0; padding: 2rem; background: ${theme.surface}; color: ${theme.text}; font-family: system-ui, sans-serif; text-align: center; }
                    .pdf-notice { max-width: 400px; margin: 2rem auto; padding: 1.5rem; border: 1px solid ${theme.border}; border-radius: 12px; background: rgba(0,0,0,0.03); }
                    .pdf-notice h3 { margin: 0 0 0.5rem; font-size: 1.1rem; }
                    .pdf-notice p { margin: 0; font-size: 0.9rem; opacity: 0.8; }
                    .pdf-icon { font-size: 2.5rem; margin-bottom: 0.75rem; }
                  </style>
                  <div class="pdf-notice">
                    <div class="pdf-icon">📄</div>
                    <h3>PDF Ready for Download</h3>
                    <p>PDF files cannot be previewed inline. Your converted PDF is ready — use the download link below to save it.</p>
                  </div>
                `;
              }
              setPreviewBanner('PDF preview not available inline. Download the file to view it.', 'info');
            } else if (content && format !== 'html') {
              // Use format-specific renderers for text-based formats
              switch(format) {
                case 'csv':
                  renderCSVPreview(content);
                  break;
                case 'json':
                  renderJSONPreview(content);
                  break;
                case 'md':
                case 'markdown':
                  renderMarkdownPreview(content);
                  break;
                case 'txt':
                case 'text':
                  renderTextPreview(content);
                  break;
                case 'tex':
                case 'latex':
                  renderTeXPreview(content);
                  break;
                default:
                  // Fallback to HTML if available
                  if (html && previewIframe) {
                    previewIframe.srcdoc = html;
                  } else if (content && previewIframe) {
                    renderTextPreview(content);
                  }
              }
            } else if (html && previewIframe) {
              // Use HTML preview for HTML format or when no content available
              previewIframe.srcdoc = html;
            } else {
              // No preview available
              if (previewUnavailableCard) previewUnavailableCard.style.display = '';
              if (previewIframe) previewIframe.srcdoc = '';
            }
          }
        }

        function handleDataUrlDownload(event, href, filename, fallbackMime) {
          if (!href || typeof href !== 'string' || !href.startsWith('data:')) return false;
          event.preventDefault();
          try {
            const firstComma = href.indexOf(',');
            if (firstComma === -1) return false;
            const meta = href.slice(5, firstComma);
            const dataPart = href.slice(firstComma + 1);
            const isBase64 = /;base64$/i.test(meta);
            let mimeType = (meta.replace(/;base64$/i, '') || fallbackMime || 'application/octet-stream');
            const ALLOWED_MIMES = [
              'text/plain', 'text/html', 'text/markdown', 'text/rtf', 'text/csv',
              'application/pdf', 'application/rtf',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'application/vnd.oasis.opendocument.text',
              'application/vnd.oasis.opendocument.presentation',
              'application/vnd.openxmlformats-officedocument.presentationml.presentation',
              'application/octet-stream'
            ];
            const isAllowed = ALLOWED_MIMES.some((allowed) => mimeType.startsWith(allowed));
            if (!isAllowed) mimeType = 'application/octet-stream';
            let content;
            if (isBase64) {
              const binary = atob(dataPart);
              const len = binary.length;
              const bytes = new Uint8Array(len);
              for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
              content = new Blob([bytes], { type: mimeType });
            } else {
              const decoded = decodeURIComponent(dataPart.replace(/\+/g, '%20'));
              content = decoded;
            }
            if (window.tuDownloadBlob) {
              window.tuDownloadBlob({ filename, mimeType, content });
              return true;
            }
            const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
              try { document.body.removeChild(a); } catch (e) {}
              try { URL.revokeObjectURL(url); } catch (e) {}
            }, 0);
            return true;
          } catch (e) {
            console.error('converter: data URL download failed, falling back to default link', e);
            return false;
          }
        }

        // Only show download links in convert mode, not preview mode
        if (!previewOnly) {
          data.outputs.forEach((output) => {
            const tr = document.createElement('tr');
          const format = output.target || output.format || output.to || 'unknown';
          let filename = output.name || output.filename || `output.${format}`;
          const blobUrl = output.blobUrl || output.url;
          const size = output.size ? formatBytes(output.size) : '—';

          const isZip = /\.zip$/i.test(filename);
          const customExtValue = customExt && typeof customExt.value === 'string' ? customExt.value.trim() : '';
          if (customExtValue && !isZip) {
            const normalizedExt = customExtValue.replace(/^\.+/, '');
            if (normalizedExt && (format === 'txt' || format === 'md' || format === 'html')) {
              if (/\.[^.]+$/.test(filename)) {
                filename = filename.replace(/\.[^.]+$/, '.' + normalizedExt);
              } else {
                filename = filename + '.' + normalizedExt;
              }
            }
          }

            const downloadLink = document.createElement('a');
            downloadLink.href = blobUrl;
            downloadLink.download = filename;
            downloadLink.textContent = 'Download file';
            downloadLink.className = 'download-link';
            downloadLink.title = 'Download file via a secure browser download';
            downloadLink.addEventListener('click', (event) => {
              if (!blobUrl || !blobUrl.startsWith('data:')) return;
              const fallbackMime = output.contentType || output.mimeType || 'application/octet-stream';
              const handled = handleDataUrlDownload(event, blobUrl, filename, fallbackMime);
              if (!handled) window.location.href = blobUrl;
            });

            const downloadCell = document.createElement('td');
            downloadCell.appendChild(downloadLink);

            tr.innerHTML = `
              <td>${escapeHtml(format)}${isZip ? ' <span class="badge" title="ZIP package">ZIP</span>' : ''}</td>
              <td>${escapeHtml(filename)}</td>
              <td>${escapeHtml(size)}</td>
            `;
            tr.appendChild(downloadCell);
            resultsBody.appendChild(tr);
          });

          // Update preview for PDF format in Convert mode
          const firstOutput = data.outputs[0];
          const outputFormat = (firstOutput?.target || firstOutput?.format || firstOutput?.to || '').toLowerCase();
          if (outputFormat === 'pdf') {
            if (previewUnavailableCard) previewUnavailableCard.style.display = 'none';
            if (previewTooBigCard) previewTooBigCard.style.display = 'none';
            if (previewIframe) {
              const theme = getPreviewThemeForIframe();
              previewIframe.srcdoc = `
                <style>
                  body { margin: 0; padding: 2rem; background: ${theme.surface}; color: ${theme.text}; font-family: system-ui, sans-serif; text-align: center; }
                  .pdf-notice { max-width: 400px; margin: 2rem auto; padding: 1.5rem; border: 1px solid ${theme.border}; border-radius: 12px; background: rgba(0,0,0,0.03); }
                  .pdf-notice h3 { margin: 0 0 0.5rem; font-size: 1.1rem; }
                  .pdf-notice p { margin: 0; font-size: 0.9rem; opacity: 0.8; }
                  .pdf-icon { font-size: 2.5rem; margin-bottom: 0.75rem; }
                </style>
                <div class="pdf-notice">
                  <div class="pdf-icon">📄</div>
                  <h3>PDF Ready for Download</h3>
                  <p>PDF files cannot be previewed inline. Your converted PDF is ready — use the download link below to save it.</p>
                </div>
              `;
            }
            if (previewHeader) {
              previewHeader.textContent = 'PDF output';
              previewHeader.setAttribute('aria-label', 'PDF output – inline document preview');
            }
          }
        }

        let baseMsg = previewOnly
          ? 'Preview ready. Download to inspect the full converted file.'
          : `Converted ${data.outputs.length} file(s). Use the Download File links below to save each result.`;
        if (!previewOnly && isPdfInput) baseMsg += summarizePdfMeta(data);
        updateProgressState(baseMsg, 100);
      } catch (err) {
        if (thisRequest === requestCounter) updateProgressState('Error: ' + (err.message || 'Conversion failed'), null);
        console.error('Conversion error:', err);
      } finally {
        if (thisRequest === requestCounter) {
          convertBtn.disabled = false;
          previewBtn.disabled = false;
          isBusy = false;
        }
      }
    }

    advToggle?.addEventListener('click', () => {
      const on = multiTargets && multiTargets.style.display === 'none';
      setAdvanced(on);
      if (on) {
        if (toMd) toMd.checked = toSingle?.value === 'md';
        if (toTxt) toTxt.checked = toSingle?.value === 'txt';
        if (toHtml) toHtml.checked = toSingle?.value === 'html';
        if (toDocx) toDocx.checked = toSingle?.value === 'docx';
        if (toRtf) toRtf.checked = toSingle?.value === 'rtf';
        if (toPdf) toPdf.checked = toSingle?.value === 'pdf';
        if (toEpub) toEpub.checked = toSingle?.value === 'epub';
      }
      persistPrefs();
      updateOptionAvailability();
    });

    toSingle?.addEventListener('change', () => { persistPrefs(); updateOptionAvailability(); });
    mdDialectSel?.addEventListener('change', persistPrefs);
    pdfMarginPresetSel?.addEventListener('change', persistPrefs);
    pdfPageSizeSel?.addEventListener('change', persistPrefs);

    convertBtn?.addEventListener('click', () => runConvert({ previewOnly: false }));
    previewBtn?.addEventListener('click', () => runConvert({ previewOnly: true }));

    clearBtn?.addEventListener('click', () => {
      if (textInput) textInput.value = '';
      if (fileInput) fileInput.value = '';
      currentFile = null;
      if (resultsBody) {
        resultsBody.innerHTML = '<tr id="resultsEmptyRow"><td colspan="4" style="color: var(--muted, #97a3c2); text-align: center; padding: 0.75rem 0;">No files yet — your converted files will appear here after you click <strong>Convert</strong>.</td></tr>';
      }
      updateProgressState('Ready to convert. Paste content or upload a file.', null);
    });

    demoBtn?.addEventListener('click', loadTryExample);
    fromSelect?.addEventListener('change', updateOptionAvailability);
    toMd?.addEventListener('change', updateOptionAvailability);
    toTxt?.addEventListener('change', updateOptionAvailability);
    toHtml?.addEventListener('change', updateOptionAvailability);
    toDocx?.addEventListener('change', updateOptionAvailability);
    toRtf?.addEventListener('change', updateOptionAvailability);
    toOdt?.addEventListener('change', updateOptionAvailability);
    toPdf?.addEventListener('change', updateOptionAvailability);
    toEpub?.addEventListener('change', updateOptionAvailability);

    restorePrefs();
    updateOptionAvailability();
    updateProgressState('Ready.', null);

    const keyHandler = (e) => {
      const tag = (e.target && e.target.tagName) || '';
      const inField = /^(INPUT|TEXTAREA|SELECT)$/.test(tag) || !!(e.target && e.target.isContentEditable);
      if (inField) return;
      if (!(e.metaKey || e.ctrlKey)) return;
      if (isBusy) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        convertBtn?.click();
      }
    };
    document.addEventListener('keydown', keyHandler);

    return () => {
      document.removeEventListener('keydown', keyHandler);
    };
  });
</script>

<svelte:head>
  <title>Document Converter — TinyUtils</title>
  <meta
    name="description"
    content="Convert between common document formats: Markdown, PDF, DOCX, HTML, RTF, ODT, LaTeX, and more. Paste or upload your content and download converted files."
  />
  <link rel="canonical" href="/tools/text-converter/" />
  <meta property="og:title" content="Document Converter — TinyUtils" />
  <meta property="og:description" content="Convert between popular formats: Markdown, PDF, DOCX, HTML, RTF, ODT, and more." />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="/og.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3079281180008443" crossorigin="anonymous"></script>
  <script src="/scripts/storage-utils.js" defer></script>
  <script src="/scripts/download-utils.js" defer></script>
  <link rel="stylesheet" href="/styles.css" />
</svelte:head>

<div class="converter-page">
  <div class="container tool-intro">
    <div class="tool-hero">
      <span class="tool-hero-icon" aria-hidden="true">📄</span>
      <h1>Document Converter</h1>
      <p class="tool-hero-subtitle">
        Convert between 100+ document formats: Markdown, PDF, DOCX, HTML, RTF, ODT, LaTeX, and more. Paste content or upload a file, choose your format, then download.
      </p>
      <p class="tool-hero-note">
        For best results, keep individual files under roughly 100&nbsp;MB. Very large files may skip the inline preview
        but will still convert and be available to download.
      </p>
      <p><a class="cta" href="/tools/">← Back to all tools</a></p>
    </div>

    <section
      class="ad-slot"
      aria-label="Sponsored"
      style="max-width: 320px; margin: var(--space-6) auto; padding: var(--space-4); border: 1px solid var(--border, #1c2742); border-radius: 12px; background: transparent;"
    >
      <ins
        class="adsbygoogle"
        style="display:block; width:100%; min-height: 120px; max-height: 160px; margin: 0 auto;"
        data-ad-client="ca-pub-3079281180008443"
        data-ad-slot="3664281983"
        data-ad-format="auto"
        data-full-width-responsive="true"
      ></ins>
      <svelte:element this={'script'}>
        {`
          try{(adsbygoogle = window.adsbygoogle || []).push({});}catch(e){}
        `}
      </svelte:element>
      <p class="help" style="color: var(--muted, #97a3c2); font-size: 0.72rem; margin: 0.35rem 0 0; text-align: center; opacity: 0.75;">
        Ads help keep TinyUtils fast and free.
      </p>
    </section>

    <section class="card" aria-labelledby="inputHeading">
      <h2 id="inputHeading">Input</h2>
      <p class="help" style="color: var(--muted, #97a3c2); margin-top: 0.25rem; max-width: 46rem;">
        Start here: paste your content or upload a file, pick your output format, then click <strong>Convert</strong>.
        Extremely large documents may take longer and may only show a partial on-page preview, but your downloads will still contain the full converted content.
      </p>
      <div class="input-section">
        <label for="textInput">Paste your document content
          <span class="help" style="color: var(--muted, #97a3c2); font-size: 0.85rem; display: block; margin-top: 0.2rem;">
            Enter or paste Markdown, HTML, plain text, or other document content.
          </span>
        </label>
        <textarea
          id="textInput"
          data-testid="converter-text-input"
          placeholder="Enter your document content here..."
        ></textarea>

        <label for="fileInput">Or upload a file (.md, .html, .docx, .pdf, .rtf, .odt, etc.)
          <span class="help" style="color: var(--muted, #97a3c2); font-size: 0.85rem; display: block; margin-top: 0.2rem;">
            Supports many formats including Markdown, Word, PDF, HTML, RTF, OpenDocument, and LaTeX.
          </span>
        </label>
        <input
          type="file"
          id="fileInput"
          accept=".md,.markdown,.txt,.html,.htm,.docx,.odt,.rtf,.pdf,application/pdf,.tex,.epub,.zip"
        />
      </div>

      <div class="format-options" aria-label="Format options">
        <label for="fromFormat"><strong>From:</strong></label>
        <select id="fromFormat" name="from">
          <option value="auto" selected>Auto-detect</option>
          <option value="markdown">Markdown (.md)</option>
          <option value="text">Plain Text (.txt)</option>
          <option value="html">HTML (.html)</option>
          <option value="latex">LaTeX (.tex)</option>
          <option value="docx">Word (.docx)</option>
          <option value="odt">OpenDocument (.odt)</option>
          <option value="rtf">RTF (.rtf)</option>
          <option value="pdf">PDF (.pdf)</option>
          <option value="epub">EPUB (.epub)</option>
        </select>
      </div>

      <div class="format-options" aria-label="Target formats">
        <label for="toSingle"><strong>Primary download format:</strong></label>
        <select id="toSingle" name="toSingle">
          <option value="md" selected>Markdown (.md)</option>
          <option value="txt">Plain Text (.txt)</option>
          <option value="html">HTML (.html)</option>
          <option value="docx">Word (.docx)</option>
          <option value="odt">OpenDocument (.odt)</option>
          <option value="rtf">RTF (.rtf)</option>
          <option value="pdf">PDF (.pdf)</option>
          <option value="epub">EPUB (.epub)</option>
        </select>
        <button id="advToggle" class="secondary" type="button" aria-expanded="false" aria-controls="multiTargets">+ Add more formats (optional)</button>
      </div>

      <div id="multiTargets" class="format-options" aria-label="Target formats (advanced)" style="display:none">
        <p class="label-heading"><strong>Additional formats:</strong></p>
        <label><input type="checkbox" id="toMd" checked /> Markdown</label>
        <label><input type="checkbox" id="toTxt" /> Plain Text</label>
        <label><input type="checkbox" id="toHtml" /> HTML</label>
        <label><input type="checkbox" id="toDocx" /> Word (.docx)</label>
        <label><input type="checkbox" id="toOdt" /> OpenDocument (.odt)</label>
        <label><input type="checkbox" id="toRtf" /> RTF (.rtf)</label>
        <label><input type="checkbox" id="toPdf" /> PDF (.pdf)</label>
        <label><input type="checkbox" id="toEpub" /> EPUB (.epub)</label>
      </div>

      <div class="format-options advanced-ext-row" aria-label="Custom text extension (advanced)">
        <label for="customExt">
          <strong>Custom text extension (advanced):</strong>
          <span class="help" style="color: var(--muted, #97a3c2); font-size: 0.8rem; margin-left: 0.35rem;">
            Optional. Overrides .txt/.md/.html filenames for text outputs (for example: .csv, .log, .cfg).
          </span>
        </label>
        <input id="customExt" type="text" placeholder=".csv" style="max-width: 140px;" />
      </div>

      <div class="format-options" aria-label="Markdown dialect" id="mdDialectRow">
        <label for="mdDialect">
          <strong>Markdown dialect (advanced):</strong>
          <span class="help" style="color: var(--muted, #97a3c2); font-size: 0.85rem; margin-left: 0.35rem;">
            Most users can leave this on the default.
          </span>
        </label>
        <select id="mdDialect" name="mdDialect">
          <option value="">Auto (backend default — GFM)</option>
          <option value="gfm" selected>GitHub Flavored Markdown (GFM)</option>
          <option value="commonmark_x">CommonMark extended (commonmark_x)</option>
          <option value="commonmark">CommonMark (spec)</option>
          <option value="markdown">Markdown (Pandoc)</option>
          <option value="markdown_mmd">MultiMarkdown (markdown_mmd)</option>
          <option value="markdown_strict">Markdown (strict)</option>
          <option value="markdown_phpextra">PHP Extra Markdown (markdown_phpextra)</option>
        </select>
      </div>

      <div class="format-options" aria-label="Options">
        <p class="label-heading">
          <strong>Options:</strong>
          <span class="help" style="color: var(--muted, #97a3c2); font-size: 0.85rem; margin-left: 0.35rem;">
            These defaults are safe; tweak only if you know you need to.
          </span>
        </p>
        <label title="Accept tracked changes in Word docs"><input type="checkbox" id="optAcceptTracked" checked /> Accept tracked changes</label>
        <label title="Extract embedded images/media when available"><input type="checkbox" id="optExtractMedia" /> Extract media</label>
        <label title="Remove zero-width characters"><input type="checkbox" id="optRemoveZW" checked /> Remove zero-width</label>
        <div class="pdf-layout-options">
          <label for="pdfMarginPreset">
            <strong>PDF layout:</strong>
            <span class="help" style="color: var(--muted, #97a3c2); font-size: 0.85rem; margin-left: 0.35rem;">
              Affects margins for the fallback PDF renderer only.
            </span>
          </label>
          <select id="pdfMarginPreset" name="pdfMarginPreset">
            <option value="">Standard margins</option>
            <option value="compact">Compact (smaller margins)</option>
            <option value="wide">Wide (larger margins)</option>
          </select>
          <label for="pdfPageSize" style="margin-left: 0.75rem;">
            <strong>Page size:</strong>
          </label>
          <select id="pdfPageSize" name="pdfPageSize">
            <option value="">US Letter</option>
            <option value="A4">A4</option>
          </select>
        </div>
      </div>

      <div class="actions-row">
        <button
          id="previewBtn"
          class="secondary"
          type="button"
          data-testid="converter-preview-button"
        >
          Preview
        </button>
        <button id="convertBtn" class="primary" type="button">Convert</button>
        <button id="clearBtn" class="secondary" type="button">Clear</button>
        <button id="demoBtn" class="secondary" type="button" title="Load a small example document to see how conversion works.">Try example</button>
        <span class="badge">Shortcut: <kbd>Ctrl/Cmd + Enter</kbd> to convert</span>
      </div>
      <div id="progress" class="progress-banner" aria-live="polite" role="status">
        <span id="progressMessage" class="progress-text">Ready — paste content or upload a file, then click <strong>Convert</strong>.</span>
        <progress id="progressMeter" max="100" value="0" hidden></progress>
      </div>
    </section>

    <section class="card" aria-labelledby="resultsHeading">
      <h2 id="resultsHeading">Results</h2>
      <div id="previewPanel" style="display:none">
        <div id="previewUnavailableCard" class="preview-card" style="display:none;">
          <p class="preview-card-title">🚫 Preview unavailable</p>
          <p class="preview-card-subtitle">We couldn't generate a safe inline preview. Download to view the full file.</p>
        </div>
        <div id="previewTooBigCard" class="preview-card" style="display:none;">
          <p class="preview-card-title">📦 Too large for preview</p>
          <p class="preview-card-subtitle">This file is too large for a full inline preview, but the complete converted document is still ready to download below.</p>
        </div>
        <div
          id="previewStatusBanner"
          class="preview-status-banner"
          role="status"
          aria-live="polite"
          hidden
        ></div>
        <div class="css-sentinel preview-status--info preview-status--warn"></div>
        <div id="previewHtmlBox" class="preview-html">
          <div
            id="previewHeader"
            class="preview-html__header"
            data-testid="converter-preview-header"
          >
            Preview
          </div>
          <iframe
            id="previewIframe"
            data-testid="converter-preview-iframe"
            sandbox="allow-same-origin allow-popups allow-forms"
            title="Formatted preview"
          ></iframe>
        </div>
      </div>
      <div class="tableWrap">
        <table id="results">
          <thead>
            <tr>
              <th scope="col">Format</th>
              <th scope="col">Filename</th>
              <th scope="col">Size</th>
              <th scope="col">Download</th>
            </tr>
          </thead>
          <tbody>
            <tr id="resultsEmptyRow">
              <td colspan="4" style="color: var(--muted, #97a3c2); text-align: center; padding: 0.75rem 0;">
                No files yet — your converted files will appear here after you click <strong>Convert</strong>.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <details class="card formats-card" aria-labelledby="formatsHeading">
      <summary>
        <h2 id="formatsHeading">Supported formats</h2>
        <p style="color: var(--muted, #97a3c2); margin: 0;">We support many formats. Common inputs include:</p>
      </summary>
      <div class="formats-body">
        <ul>
          <li><strong>Markdown:</strong> .md, .markdown</li>
          <li><strong>Plain text:</strong> .txt</li>
          <li><strong>HTML:</strong> .html, .htm</li>
          <li><strong>LaTeX:</strong> .tex</li>
          <li><strong>Word:</strong> .docx</li>
          <li><strong>OpenDocument:</strong> .odt</li>
          <li><strong>Rich Text:</strong> .rtf</li>
          <li><strong>PDF:</strong> .pdf (text‑based; scanned PDFs work best after OCR)</li>
          <li><strong>EPUB/ZIP bundles:</strong> .epub, .zip</li>
        </ul>
        <p class="help" style="color: var(--muted, #97a3c2)">Outputs include: Markdown, Plain Text, HTML, Word (.docx), OpenDocument (.odt), PDF, and RTF. See the full list on our <a href="/tools/formats/">Supported Formats</a> page.</p>
      </div>
    </details>
  </div>
</div>

<style>
  /* ═══════════════════════════════════════════════════════════
     LIQUID GLASS TEXT CONVERTER
     ═══════════════════════════════════════════════════════════ */

  main { padding-bottom: 48px; }
  .tool-intro { position: relative; }

  .tool-hero {
    text-align: center;
    padding: var(--space-12) 0 var(--space-8);
    position: relative;
  }

  .tool-hero-icon {
    font-size: 4rem;
    display: block;
    margin-bottom: var(--space-4);
    animation: fadeIn 0.6s ease-out;
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
    animation: fadeIn 0.6s ease-out 0.1s backwards;
  }

  .tool-hero-subtitle {
    font-size: var(--text-lg);
    color: var(--text-secondary);
    max-width: 700px;
    margin: 0 auto var(--space-4);
    line-height: 1.6;
    animation: fadeIn 0.6s ease-out 0.2s backwards;
  }

  .tool-intro p {
    margin-top: 0;
    color: var(--text-tertiary);
  }

  /* Glass card */
  .card {
    position: relative;
    margin-top: 1rem;
    background: var(--glass-bg);
    backdrop-filter: blur(var(--glass-blur));
    -webkit-backdrop-filter: blur(var(--glass-blur));
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-2xl);
    padding: var(--space-6);
    overflow: hidden;
    animation: fadeIn 0.6s ease-out 0.3s backwards;
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

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @media (prefers-reduced-motion: reduce) {
    .tool-hero-icon, .tool-hero h1, .tool-hero-subtitle, .card { animation: none !important; }
  }

  .input-section {
    margin-top: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    position: relative;
    z-index: 1;
  }

  .input-section label {
    color: var(--text-primary);
    font-weight: var(--font-medium);
  }

  .input-section textarea {
    min-height: 200px;
    font-family: var(--font-mono);
    background: var(--glass-bg);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    padding: 0.75rem;
    color: var(--text-primary);
    transition: all 0.2s ease;
  }

  .input-section textarea:focus {
    outline: none;
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
  }

  :global(html[data-theme="light"]) .input-section textarea {
    background: rgba(255, 255, 255, 0.6);
  }

  .input-section input[type="file"] {
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    padding: 0.5rem;
    color: var(--text-primary);
  }

  .format-options {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    align-items: center;
    margin-top: 1rem;
    position: relative;
    z-index: 1;
  }

  .format-options label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text-secondary);
  }

  .format-options select {
    background: var(--glass-bg);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    padding: 0.5rem 0.75rem;
    color: var(--text-primary);
  }

  .format-options select:focus {
    outline: none;
    border-color: var(--accent-primary);
  }

  :global(html[data-theme="light"]) .format-options select {
    background: rgba(255, 255, 255, 0.6);
  }

  .actions-row {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    align-items: center;
    margin-top: 1rem;
    position: relative;
    z-index: 1;
  }

  .actions-row button.primary {
    background: var(--accent-gradient);
    color: #fff;
    border: none;
    padding: 0.65rem 1.4rem;
    border-radius: var(--radius-xl);
    cursor: pointer;
    font-weight: var(--font-semibold);
    transition: all 0.2s ease;
  }

  .actions-row button.primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 20px rgba(59, 130, 246, 0.4);
  }

  .actions-row button.secondary {
    background: var(--glass-bg);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    color: var(--text-primary);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-xl);
    padding: 0.55rem 1.25rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .actions-row button.secondary:hover {
    border-color: var(--accent-primary);
    background: var(--glass-bg-hover);
  }

  #progress {
    margin-top: 1rem;
    position: relative;
    z-index: 1;
  }

  /* Glass table wrapper */
  .tableWrap {
    margin-top: 1rem;
    max-height: 70vh;
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

  #previewPanel {
    margin-bottom: 1rem;
    position: relative;
    z-index: 1;
  }

  /* Glass preview */
  .preview-html {
    margin-top: 0.75rem;
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-xl);
    overflow: hidden;
    background: var(--glass-bg);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }

  .preview-card {
    margin-top: 0.75rem;
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-xl);
    background: var(--glass-bg);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    padding: 1.5rem;
    text-align: center;
  }

  .preview-card-title {
    font-size: var(--text-lg);
    font-weight: var(--font-bold);
    margin-bottom: 0.25rem;
    color: var(--text-primary);
  }

  .preview-card-subtitle {
    color: var(--text-tertiary);
  }

  .preview-status-banner {
    margin-top: 0.5rem;
    font-size: 0.9rem;
    color: var(--text-secondary);
    padding: 0.35rem 0.5rem;
    border-radius: var(--radius-lg);
  }

  .preview-status--info {
    background: rgba(59, 130, 246, 0.1);
    color: var(--accent-primary);
  }

  .preview-status--warn {
    background: rgba(251, 146, 60, 0.1);
    color: #fb923c;
  }

  .preview-html__header {
    padding: 0.6rem 0.9rem;
    font-weight: var(--font-semibold);
    border-bottom: 1px solid var(--glass-border);
    background: var(--glass-bg-hover);
    color: var(--text-primary);
  }

  #previewIframe {
    width: 100%;
    height: 22rem;
    border: 0;
    display: block;
    background: white;
  }

  #results thead th {
    position: sticky;
    top: 0;
    z-index: 2;
    background: var(--glass-bg-hover);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    color: var(--text-primary);
    padding: 0.6rem 0.75rem;
    border-bottom: 1px solid var(--glass-border);
    font-weight: var(--font-semibold);
    text-align: left;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }

  :global(html[data-theme="light"]) #results thead th {
    background: rgba(255, 255, 255, 0.8);
  }

  #results tbody td {
    word-wrap: break-word;
    overflow-wrap: break-word;
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid var(--glass-border);
    color: var(--text-secondary);
  }

  #results tbody tr:hover {
    background: var(--glass-bg-hover);
  }

  .download-link {
    color: var(--accent-primary);
    text-decoration: none;
    cursor: pointer;
  }

  .download-link:hover {
    text-decoration: underline;
    color: var(--accent-secondary);
  }

  /* Glass toast */
  .toast {
    position: fixed;
    right: 16px;
    bottom: 16px;
    background: var(--glass-bg);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    color: var(--text-primary);
    border: 1px solid var(--accent-primary);
    padding: 10px 16px;
    border-radius: var(--radius-full);
    z-index: 9999;
    box-shadow: 0 12px 40px var(--glass-shadow),
                0 0 20px rgba(59, 130, 246, 0.2);
  }

  :global(html[data-theme="light"]) .toast {
    background: rgba(255, 255, 255, 0.9);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15),
                inset 0 1px 0 rgba(255, 255, 255, 0.9);
  }

  .badge {
    color: var(--text-tertiary);
    font-size: 0.85rem;
  }

  kbd {
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
    font-size: 0.85rem;
    font-family: var(--font-mono);
  }

  .formats-card summary {
    list-style: none;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    position: relative;
    padding-left: 1.2rem;
    z-index: 1;
  }

  .formats-card summary::-webkit-details-marker { display: none; }

  .formats-card summary::before {
    content: '▸';
    position: absolute;
    left: 0;
    top: 0.35rem;
    font-size: 0.9rem;
    color: var(--text-tertiary);
    transition: transform 0.15s ease;
  }

  .formats-card[open] summary::before {
    content: '▾';
    transform: translateY(1px);
  }

  .formats-card summary h2 {
    margin: 0;
  }

  .formats-body {
    margin-top: 0.5rem;
    position: relative;
    z-index: 1;
    color: var(--text-secondary);
  }

  .formats-body ul {
    padding-left: 1.25rem;
  }

  .formats-body a {
    color: var(--accent-primary);
    text-decoration: none;
  }

  .formats-body a:hover {
    text-decoration: underline;
  }

  /* sentinel elements to mark dynamic classes as used for Svelte CSS analysis */
  .css-sentinel { display: none; }
</style>

<!-- CSS sentinels for dynamically applied classes -->
<span class="css-sentinel download-link" aria-hidden="true"></span>
<span class="css-sentinel toast" aria-hidden="true"></span>
<button class="css-sentinel actions-row primary" disabled aria-hidden="true"></button>
