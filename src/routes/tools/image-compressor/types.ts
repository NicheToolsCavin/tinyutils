export type OutputFormat = 'keep' | 'jpeg' | 'png' | 'webp';

export type ResizeMode = 'none' | 'fit';

export interface ImageToolSettings {
	outputFormat: OutputFormat;
	/** 0..1 (only used for lossy output formats like JPEG/WebP) */
	quality: number;
	resize: {
		mode: ResizeMode;
		maxWidth: number | null;
		maxHeight: number | null;
	};
	/** Used when exporting to JPEG from a transparent source */
	jpegBackground: string;
	/** When downscaling a lot, do multi-step scaling for better quality */
	highQualityResize: boolean;
}

export const SUPPORTED_IMAGE_EXTENSIONS = new Set([
	'jpg',
	'jpeg',
	'png',
	'webp',
	'heic',
	'heif'
]);

export function makeId(prefix = 'img'): string {
	return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

export function clamp(n: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, n));
}

export function formatBytes(bytes: number): string {
	if (!Number.isFinite(bytes)) return '—';
	const thresh = 1024;
	if (Math.abs(bytes) < thresh) return `${bytes} B`;
	const units = ['KB', 'MB', 'GB', 'TB'];
	let u = -1;
	let b = bytes;
	do {
		b /= thresh;
		u++;
	} while (Math.abs(b) >= thresh && u < units.length - 1);
	return `${b.toFixed(b >= 10 ? 1 : 2)} ${units[u]}`;
}

export function getExtension(name: string): string | null {
	const idx = name.lastIndexOf('.');
	if (idx <= 0) return null;
	return name.slice(idx + 1).toLowerCase();
}

export function replaceExtension(name: string, newExtNoDot: string): string {
	const idx = name.lastIndexOf('.');
	const safeExt = newExtNoDot.replace(/^\./, '').toLowerCase();
	if (idx <= 0) return `${name}.${safeExt}`;
	return `${name.slice(0, idx)}.${safeExt}`;
}

export function sanitizeFilename(name: string): string {
	// Keep folder separators for ZIP entries, sanitize per segment.
	return name
		.split('/')
		.map((seg) =>
			seg
				.replace(/[\\:*?"<>|]+/g, '_')
				.replace(/\s+/g, ' ')
				.trim()
				.slice(0, 180) || 'file'
		)
		.join('/');
}

export function withSuffixIfNeeded(name: string, existing: Set<string>): string {
	if (!existing.has(name)) return name;
	const extIdx = name.lastIndexOf('.');
	const base = extIdx > 0 ? name.slice(0, extIdx) : name;
	const ext = extIdx > 0 ? name.slice(extIdx) : '';
	let i = 2;
	while (existing.has(`${base} (${i})${ext}`)) i++;
	return `${base} (${i})${ext}`;
}

export function isZipFile(file: File): boolean {
	const lower = file.name.toLowerCase();
	return (
		lower.endsWith('.zip') ||
		file.type === 'application/zip' ||
		file.type === 'application/x-zip-compressed'
	);
}

export function isHeicFile(file: File): boolean {
	const ext = getExtension(file.name);
	return ext === 'heic' || ext === 'heif' || file.type === 'image/heic' || file.type === 'image/heif';
}

export function isSupportedImageFile(file: File): boolean {
	if (isZipFile(file)) return true;
	const ext = getExtension(file.name);
	if (ext && SUPPORTED_IMAGE_EXTENSIONS.has(ext)) return true;
	// Some browsers set types like image/jpeg, image/png, image/webp
	return file.type.startsWith('image/');
}

export function outputMimeFromFormat(format: OutputFormat, inputMime: string): string {
	if (format === 'keep') return inputMime || 'image/png';
	if (format === 'jpeg') return 'image/jpeg';
	if (format === 'png') return 'image/png';
	return 'image/webp';
}

export function outputExtensionFromMime(mime: string): string | null {
	switch (mime) {
		case 'image/jpeg':
			return 'jpg';
		case 'image/png':
			return 'png';
		case 'image/webp':
			return 'webp';
		case 'image/heic':
		case 'image/heif':
			return 'heic';
		default:
			return null;
	}
}

export function guessMimeFromName(name: string): string | null {
	const ext = getExtension(name);
	switch (ext) {
		case 'jpg':
		case 'jpeg':
			return 'image/jpeg';
		case 'png':
			return 'image/png';
		case 'webp':
			return 'image/webp';
		case 'heic':
			return 'image/heic';
		case 'heif':
			return 'image/heif';
		case 'zip':
			return 'application/zip';
		default:
			return null;
	}
}
