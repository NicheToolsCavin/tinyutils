// Shared helpers for validating download exports in tiny-reactive harnesses.
//
// Pattern:
//   1) Call patchExportDownloads(client, markerId) once to install an
//      anchor-click wrapper inside the page. The wrapper watches for
//      blob: downloads with a download filename and writes a marker of
//      the form "filename|contentSnippet" into a hidden div.
//   2) Use validateExport(...) to wait for an enabled export button,
//      click it via the harness, wait for the marker to populate, and
//      assert on filename/content patterns without touching production
//      code or stubbing any data.

/**
 * Install a one-time patch for HTMLAnchorElement.click that records
 * download filename + a snippet of the downloaded blob into a hidden
 * marker element. This is intentionally non-invasive and only applied
 * inside the test page.
 *
 * @param {object} client - tiny-reactive client from createTinyReactiveClient
 * @param {string} markerId - DOM id used for the hidden marker element
 */
export async function patchExportDownloads(client, markerId = '__exportMeta') {
  await client.trCmd({
    id: `patch-export-downloads-${markerId}`,
    cmd: 'waitForFunction',
    args: {
      js: `() => {
        const markerId = ${JSON.stringify(markerId)};
        if (window[markerId + '_patched']) return true;

        window[markerId + '_patched'] = true;
        const OrigClick = HTMLAnchorElement.prototype.click;

        HTMLAnchorElement.prototype.click = function patchedClick() {
          try {
            if (this && this.download && this.href && this.href.startsWith('blob:')) {
              let el = document.getElementById(markerId);
              if (!el) {
                el = document.createElement('div');
                el.id = markerId;
                el.style.display = 'none';
                document.body.appendChild(el);
              }
              const filename = this.download || '';
              el.textContent = filename;
              try {
                fetch(this.href)
                  .then((r) => r.text())
                  .then((text) => {
                    const snippet = text ? String(text).slice(0, 200) : '';
                    el.textContent = filename + '|' + snippet;
                  })
                  .catch(() => {});
              } catch (e) {
                // best-effort only; do not break the export
              }
            }
          } catch (e) {
            // ignore errors in the patch; always fall through to the
            // original click implementation.
          }
          return OrigClick.apply(this, arguments);
        };
        return true;
      }`,
      timeout: 10000,
    },
  });
}

/**
 * Validate that an export button produces a real blob download with a
 * filename and content that match simple patterns.
 *
 * @param {object} client - tiny-reactive client
 * @param {string} buttonSelector - CSS selector for the export button
 * @param {string} markerId - DOM id used for the hidden marker element
 * @param {RegExp|null} filenamePattern - pattern applied to filename|snippet
 * @param {RegExp|null} contentPattern - pattern applied to filename|snippet
 * @returns {Promise<{ok: boolean, marker: string|null, error: string|null}>}
 */
export async function validateExport(client, buttonSelector, markerId, filenamePattern, contentPattern) {
  try {
    // Wait for the export button to be present and enabled.
    await client.trCmd({
      id: `wait-export-enabled-${buttonSelector}`,
      cmd: 'waitForFunction',
      args: {
        js: `() => {
          const btn = document.querySelector(${JSON.stringify(buttonSelector)});
          return !!btn && !btn.disabled;
        }`,
        timeout: 30000,
      },
    });

    // Click the export button via the harness.
    await client.clickButton(buttonSelector);

    // Wait for the marker element to be created and populated.
    await client.trCmd({
      id: `wait-export-marker-${buttonSelector}`,
      cmd: 'waitForFunction',
      args: {
        js: `() => {
          const el = document.getElementById(${JSON.stringify(markerId)});
          return !!el && typeof el.textContent === 'string' && el.textContent.length > 0;
        }`,
        timeout: 30000,
      },
    });

    const marker = await client.getText(`#${markerId}`);
    if (!marker) {
      return { ok: false, marker: null, error: 'Marker is empty' };
    }

    const filenameOk = !filenamePattern || filenamePattern.test(marker);
    const contentOk = !contentPattern || contentPattern.test(marker);

    if (!filenameOk) {
      return {
        ok: false,
        marker,
        error: `Filename pattern failed: ${String(filenamePattern)}`,
      };
    }
    if (!contentOk) {
      return {
        ok: false,
        marker,
        error: `Content pattern failed: ${String(contentPattern)}`,
      };
    }

    return { ok: true, marker, error: null };
  } catch (err) {
    return {
      ok: false,
      marker: null,
      error: err?.message || String(err),
    };
  }
}

