const CSV_DANGEROUS_PREFIX = /^[=+\-@]/;
export const LINE_BREAK = '\r\n';

export type DownloadBlobOptions = {
  filename: string;
  mimeType?: string;
  content: Blob | string | ArrayBuffer | ArrayBufferView;
};

// Guard CSV cells so Excel/Sheets won't execute formulas.
export function protectCsvCell(value: unknown): string {
  const str = String(value ?? '');
  const trimmed = typeof (str as any).trimStart === 'function' ? (str as any).trimStart() : str;
  return CSV_DANGEROUS_PREFIX.test(trimmed) ? "'" + str : str;
}

function encodeCsvCell(value: unknown, harden = true): string {
  const cell = harden ? protectCsvCell(value) : String(value ?? '');
  return `"${cell.replace(/"/g, '""')}"`;
}

export type CsvBuildOptions = {
  header?: string[];
  meta?: Record<string, unknown> | null;
  lineBreak?: string;
  harden?: boolean;
};

export function buildCsv(rows: Array<Array<unknown>>, options: CsvBuildOptions = {}): string {
  const lb = options.lineBreak ?? LINE_BREAK;
  const harden = options.harden !== false;
  const out: string[] = [];

  if (options.header?.length) {
    out.push(options.header.join(','));
  }

  for (const row of rows) {
    out.push(row.map((cell) => encodeCsvCell(cell, harden)).join(','));
  }

  if (options.meta) {
    out.push(`# meta: ${JSON.stringify(options.meta)}`);
  }

  return out.join(lb);
}

export function downloadBlob(options: DownloadBlobOptions): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  const { filename, mimeType = 'application/octet-stream', content } = options;
  if (content == null) return;

  let url: string | null = null;
  let anchor: HTMLAnchorElement | null = null;
  try {
    const blob =
      content instanceof Blob
        ? content
        : new Blob([content as unknown as BlobPart], { type: mimeType });
    url = URL.createObjectURL(blob);
    anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
  } finally {
    setTimeout(() => {
      if (anchor?.parentNode) {
        anchor.parentNode.removeChild(anchor);
      }
      if (url) URL.revokeObjectURL(url);
    }, 0);
  }
}

// Primary download helper with tuDownloadBlob fallback.
export function downloadFile(name: string, type: string, data: Blob | string | ArrayBuffer | ArrayBufferView) {
  if (typeof window !== 'undefined' && (window as any).tuDownloadBlob) {
    try {
      (window as any).tuDownloadBlob({ filename: name, mimeType: type, content: data });
      return;
    } catch (error) {
      console.warn('tuDownloadBlob failed, falling back to Blob download', error);
    }
  }

  downloadBlob({ filename: name, mimeType: type, content: data });
}

export function downloadJson(name: string, payload: unknown) {
  const json = JSON.stringify(payload, null, 2);
  downloadFile(name, 'application/json;charset=utf-8', json);
}

export function downloadCsv(name: string, rows: Array<Array<unknown>>, meta?: Record<string, unknown> | null) {
  const csv = buildCsv(rows, { harden: true, meta });
  downloadFile(name, 'text/csv;charset=utf-8', csv);
}
