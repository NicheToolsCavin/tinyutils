/// <reference types="svelte" />
/// <reference types="vite/client" />

declare module '$lib/tools/dead-link-finder/utils.js' {
  export function clampNumber(...args: any[]): number;
  export function stripInlineComments(line: string): string;
  export function coerceUrl(input: string): string;
  export function splitMulti(value: string): string[];
  export function buildDlfPayload(input: any): any;
  export function statusGroup(status: number | null | undefined): '2' | '3' | '4' | '5' | 'null';
  export function protectCsvCell(value: unknown): string;
  export function escapeCsvCell(value: unknown): string;
  export function buildCsv(rows: any[], meta?: any, includeMetaSection?: boolean): string;
  export function summarizeRows(rows: any[], meta?: any): string;
  export function makeDatedFilename(base: string, ext: string): string;
}

declare module '$lib/utils/download' {
  export const LINE_BREAK: string;
  export type DownloadBlobOptions = {
    filename: string;
    mimeType?: string;
    content: Blob | string | ArrayBuffer | ArrayBufferView;
  };

  export type CsvBuildOptions = {
    header?: string[];
    meta?: Record<string, unknown> | null;
    lineBreak?: string;
    harden?: boolean;
  };

  export function protectCsvCell(value: unknown): string;
  export function buildCsv(rows: Array<Array<unknown>>, options?: CsvBuildOptions): string;
  export function downloadBlob(options: DownloadBlobOptions): void;
  export function downloadFile(
    name: string,
    type: string,
    data: Blob | string | ArrayBuffer | ArrayBufferView
  ): void;
  export function downloadJson(name: string, payload: unknown): void;
  export function downloadCsv(
    name: string,
    rows: Array<Array<unknown>>,
    meta?: Record<string, unknown> | null
  ): void;
}
