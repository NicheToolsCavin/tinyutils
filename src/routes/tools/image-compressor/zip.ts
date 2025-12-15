import { unzipSync, zip } from 'fflate';
import {
	SUPPORTED_IMAGE_EXTENSIONS,
	guessMimeFromName,
	getExtension,
	isSupportedImageFile,
	withSuffixIfNeeded
} from './types';

function isProbablyDirectory(path: string, data: Uint8Array): boolean {
	return path.endsWith('/') || data.byteLength === 0;
}

function normalizeZipPath(path: string): string {
	// Strip macOS metadata folders
	if (path.startsWith('__MACOSX/')) return '';
	// Strip leading './'
	if (path.startsWith('./')) return path.slice(2);
	return path;
}

export async function extractZipImages(zipFile: File): Promise<{ name: string; file: File }[]> {
	if (!isSupportedImageFile(zipFile)) throw new Error('Not a supported ZIP file.');

	const buf = await zipFile.arrayBuffer();
	const u8 = new Uint8Array(buf);
	const entries = unzipSync(u8);

	const usedNames = new Set<string>();
	const files: { name: string; file: File }[] = [];

	for (const [rawName, data] of Object.entries(entries)) {
		const name = normalizeZipPath(rawName);
		if (!name) continue;
		if (isProbablyDirectory(name, data)) continue;

		const ext = getExtension(name);
		if (!ext || !SUPPORTED_IMAGE_EXTENSIONS.has(ext)) continue;

		const deduped = withSuffixIfNeeded(name, usedNames);
		usedNames.add(deduped);

		const mime = guessMimeFromName(deduped) ?? 'application/octet-stream';
		const bytes = new Uint8Array(data);
		const blob = new Blob([bytes], { type: mime });

		// Preserve folder structure using name, but File.name must be basename in many browsers.
		const baseName = deduped.split('/').pop() || deduped;
		const file = new File([blob], baseName, { type: mime });

		files.push({ name: deduped, file });
	}

	return files;
}

export async function createZipFromBlobs(
	entries: { name: string; blob: Blob }[],
	opts: { level?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 } = {}
): Promise<Blob> {
	const files: Record<string, Uint8Array> = {};
	for (const e of entries) {
		const ab = await e.blob.arrayBuffer();
		files[e.name] = new Uint8Array(ab);
	}

	const zipped = await new Promise<Uint8Array>((resolve, reject) => {
		zip(files, { level: opts.level ?? 6 }, (err, data) => {
			if (err) reject(err);
			else resolve(data);
		});
	});

	const zipBytes = new Uint8Array(zipped);
	return new Blob([zipBytes], { type: 'application/zip' });
}
