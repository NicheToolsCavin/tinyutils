<script>
  import { onMount } from 'svelte';

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
    const previewBtn = document.getElementById('previewBtn');
    const prevHeadings = document.getElementById('prevHeadings');
    const prevSnippets = document.getElementById('prevSnippets');
    const prevImages = document.getElementById('prevImages');
    const previewPanel = document.getElementById('previewPanel');
    const convertBtn = document.getElementById('convertBtn');
    const clearBtn = document.getElementById('clearBtn');
    const demoBtn = document.getElementById('demoBtn');
    const progressMessageEl = document.getElementById('progressMessage');
    const progressMeter = document.getElementById('progressMeter');
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
        customExt: customExt ? customExt.value : ''
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
      updateProgressState('Demo content loaded — press Convert to see outputs.', 0);
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
        ? (isPdfInput ? 'Parsing PDF (layout-aware) — generating preview…' : 'Generating preview…')
        : (isPdfInput ? 'Parsing PDF (layout-aware)…' : 'Converting…');
      updateProgressState(initialMessage, previewOnly ? 40 : 20);
      if (resultsBody) resultsBody.innerHTML = '';
      if (previewPanel) previewPanel.style.display = 'none';

      const thisRequest = ++requestCounter;

      try {
        const filename = currentFile ? currentFile.name : 'input.md';
        const ext = extOf(filename);
        let fromFormat = fromSelect ? fromSelect.value : 'auto';
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

        const payload = {
          inputs: [input],
          from: fromFormat,
          to: selectedFormats,
          options: {
            acceptTrackedChanges: !!optAcceptTracked?.checked,
            extractMedia: !!optExtractMedia?.checked,
            removeZeroWidth: !!optRemoveZW?.checked,
            mdDialect: hasMd && dialectValue ? dialectValue : undefined
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
          const headings = Array.isArray(data.preview.headings) ? data.preview.headings.slice(0, 10) : [];
          const snippets = Array.isArray(data.preview.snippets) ? data.preview.snippets.slice(0, 5) : [];
          const images = Array.isArray(data.preview.images) ? data.preview.images : [];
          if (prevHeadings) prevHeadings.textContent = headings.join('\n');
          if (prevSnippets) prevSnippets.textContent = snippets.map((s) => `${(s.before || '').slice(0, 80)} → ${(s.after || '').slice(0, 80)}`).join('\n');
          if (prevImages) prevImages.textContent = String(images.length);
          if (previewPanel) previewPanel.style.display = '';
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
          downloadLink.textContent = 'Download';
          downloadLink.className = 'download-link';
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

        let baseMsg = previewOnly ? 'Preview generated.' : `Conversion complete! ${data.outputs.length} file(s) ready.`;
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

    convertBtn?.addEventListener('click', () => runConvert({ previewOnly: false }));
    previewBtn?.addEventListener('click', () => runConvert({ previewOnly: true }));

    clearBtn?.addEventListener('click', () => {
      if (textInput) textInput.value = '';
      if (fileInput) fileInput.value = '';
      currentFile = null;
      if (resultsBody) {
        resultsBody.innerHTML = '<tr id="resultsEmptyRow"><td colspan="4" style="color: var(--muted, #97a3c2); text-align: center; padding: 0.75rem 0;">No files yet — your converted files will appear here after you click <strong>Convert</strong>.</td></tr>';
      }
      updateProgressState('Ready — paste content or upload a file, then click <strong>Convert</strong>.', null);
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
      </p>
      <div class="input-section">
        <label for="textInput">Paste your document content
          <span class="help" style="color: var(--muted, #97a3c2); font-size: 0.85rem; display: block; margin-top: 0.2rem;">
            Enter or paste Markdown, HTML, plain text, or other document content.
          </span>
        </label>
        <textarea id="textInput" placeholder="Enter your document content here..."></textarea>

        <label for="fileInput">Or upload a file (.md, .html, .docx, .pdf, .rtf, .odt, etc.)
          <span class="help" style="color: var(--muted, #97a3c2); font-size: 0.85rem; display: block; margin-top: 0.2rem;">
            Supports many formats including Markdown, Word, PDF, HTML, RTF, OpenDocument, and LaTeX.
          </span>
        </label>
        <input type="file" id="fileInput" accept=".md,.markdown,.txt,.html,.htm,.docx,.odt,.rtf,.pdf,.tex,.epub,.zip" />
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
      </div>

      <div class="actions-row">
        <button id="previewBtn" class="secondary" type="button">Preview</button>
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
      <div id="previewPanel" class="tableWrap" style="display:none">
        <table id="previewTable">
          <thead>
            <tr>
              <th scope="col">Headings</th>
              <th scope="col">Snippets</th>
              <th scope="col">Images</th>
            </tr>
          </thead>
          <tbody><tr><td id="prevHeadings">—</td><td id="prevSnippets">—</td><td id="prevImages">—</td></tr></tbody>
        </table>
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
  main { padding-bottom: 48px; }
  .tool-intro { position: relative; }
  .tool-hero { text-align: center; padding: var(--space-12) 0 var(--space-8); position: relative; }
  .tool-hero-icon { font-size: 4rem; display: block; margin-bottom: var(--space-4); animation: fadeIn 0.6s ease-out; }
  .tool-hero h1 { font-size: var(--text-4xl); font-weight: var(--font-bold); background: var(--gradient-brand); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: var(--space-3); animation: fadeIn 0.6s ease-out 0.1s backwards; }
  .tool-hero-subtitle { font-size: var(--text-lg); color: var(--text-secondary); max-width: 700px; margin: 0 auto var(--space-4); line-height: 1.6; animation: fadeIn 0.6s ease-out 0.2s backwards; }
  .tool-intro p { margin-top: 0; color: var(--muted, #97a3c2); }
  .card { margin-top: 1rem; background: var(--surface-base); border: 1px solid var(--border-default); border-radius: var(--radius-xl); padding: var(--space-6); box-shadow: var(--shadow-sm); animation: fadeIn 0.6s ease-out 0.3s backwards; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  @media (prefers-reduced-motion: reduce) { .tool-hero-icon, .tool-hero h1, .tool-hero-subtitle, .card { animation: none !important; } }
  .input-section { margin-top: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
  .input-section textarea { min-height: 200px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; }
  .format-options { display: flex; gap: 1rem; flex-wrap: wrap; align-items: center; margin-top: 1rem; }
  .format-options label { display: flex; align-items: center; gap: 0.5rem; }
  .actions-row { display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; margin-top: 1rem; }
  .actions-row button.primary { background: var(--brand, #3b82f6); color: #fff; border: none; padding: 0.65rem 1.4rem; border-radius: 0.75rem; cursor: pointer; }
  .actions-row button.secondary { background: transparent; color: inherit; border: 1px solid rgba(255,255,255,0.2); border-radius: 0.75rem; padding: 0.55rem 1.25rem; cursor: pointer; }
  #progress { margin-top: 1rem; }
  .tableWrap { margin-top: 1rem; max-height: 70vh; overflow: auto; border: 1px solid #eee; border-radius: 8px; }
  #results thead th { position: sticky; top: 0; z-index: 2; background: #fff; color: #111827; box-shadow: 0 1px 0 rgba(0,0,0,0.05); }
  .download-link { color: var(--brand, #3b82f6); text-decoration: underline; cursor: pointer; }
  .toast { position: fixed; right: 16px; bottom: 16px; background: var(--panel); color: var(--text); border: 1px solid var(--border); padding: 10px 14px; border-radius: 10px; z-index: 9999; box-shadow: 0 12px 30px rgba(0,0,0,0.35); }
  .badge { color: var(--muted, #97a3c2); font-size: 0.85rem; }
  kbd { background: rgba(255,255,255,0.1); padding: 0.2rem 0.4rem; border-radius: 0.25rem; font-size: 0.85rem; }
  .formats-card summary { list-style: none; cursor: pointer; display: flex; flex-direction: column; gap: 0.25rem; position: relative; padding-left: 1.2rem; }
  .formats-card summary::-webkit-details-marker { display: none; }
  .formats-card summary::before { content: '▸'; position: absolute; left: 0; top: 0.35rem; font-size: 0.9rem; color: var(--muted, #97a3c2); transition: transform 0.15s ease; }
  .formats-card[open] summary::before { content: '▾'; transform: translateY(1px); }
  .formats-body { margin-top: 0.5rem; }
  /* sentinel elements to mark dynamic classes as used for Svelte CSS analysis */
  .css-sentinel { display: none; }
</style>

<!-- CSS sentinels for dynamically applied classes -->
<span class="css-sentinel download-link" aria-hidden="true"></span>
<span class="css-sentinel toast" aria-hidden="true"></span>
<button class="css-sentinel actions-row primary" disabled aria-hidden="true"></button>
