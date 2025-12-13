/**
 * HEIC/HEIF decoding helper.
 *
 * IMPORTANT: This intentionally runs on the main thread (DOM context) because
 * heic2any is not reliably worker-safe across bundlers.
 */

export async function heicToBlob(
	file: Blob,
	toType: 'image/png' | 'image/jpeg',
	quality = 0.92
): Promise<Blob> {
	// heic2any is big (~332kB gz), so keep it out of the initial bundle.
	const mod = await import('heic2any');
	const heic2any: any = (mod as any).default ?? mod;

	const out = await heic2any({
		blob: file,
		toType,
		quality
	});

	// Some HEIF containers can produce multiple images -> heic2any may return Blob[]
	if (Array.isArray(out)) {
		if (!out.length) throw new Error('HEIC conversion produced no output.');
		return out[0] as Blob;
	}
	return out as Blob;
}
