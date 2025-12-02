// Lightweight CSV parser shared between the converter UI and tests.
//
// Supports a pragmatic subset of RFC 4180:
// - Quoted fields with commas
// - Double quotes escaped as "" inside quoted fields
// - CRLF / LF line endings
// - Row/column trimming suitable for preview rendering

export const CSV_MAX_ROWS = 100;
// Soft guard for extremely large CSV previews. This is only used for
// the in-browser preview, not for conversion or downloads.
export const CSV_MAX_CHARS = 200_000;

export function parseCsvContent(content, maxRows = CSV_MAX_ROWS, maxChars = CSV_MAX_CHARS) {
  if (!content) return [];

  const rows = [];
  let row = [];
  let current = '';
  let inQuotes = false;
  let seenChars = 0;

  const pushCell = () => {
    const trimmed = current.trim();
    let value = trimmed;
    if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
      // Strip surrounding quotes and unescape doubled quotes.
      value = trimmed.slice(1, -1).replace(/""/g, '"');
    }
    row.push(value);
    current = '';
  };

  const pushRow = () => {
    // Skip completely empty rows produced by stray newlines.
    if (row.length === 1 && row[0] === '') {
      row = [];
      return;
    }
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < content.length; i += 1) {
    const ch = content[i];

    // Global character budget guard so a single pathological line
    // cannot blow up the preview. We still flush the current row
    // below so the user sees a partial preview instead of nothing.
    seenChars += 1;
    if (seenChars > maxChars) {
      break;
    }

    if (ch === '"') {
      if (inQuotes && content[i + 1] === '"') {
        current += '"';
        i += 1; // Consume the second quote of the escaped pair ""
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

