/**
 * HEIC/HEIF decoding helper.
 *
 * IMPORTANT: This intentionally runs on the main thread (DOM context) because
 * heic2any is not reliably worker-safe across bundlers.
 *
 * SAFARI FIX: Safari has native HEIC decoding via createImageBitmap().
 * We try native decoding first (fast, reliable on Safari) and only fall back
 * to heic2any if native fails (needed for Chrome/Firefox which lack HEIC support).
 */

/**
 * Try to decode the blob natively using createImageBitmap.
 * Works on Safari (which has native HEIC support) and for pre-converted files.
 */
async function tryNativeDecode(blob: Blob): Promise<ImageBitmap | null> {
	try {
		// Safari and macOS can decode HEIC natively
		const bitmap = await createImageBitmap(blob);
		// Validate the bitmap has valid dimensions
		if (bitmap.width > 0 && bitmap.height > 0) {
			return bitmap;
		}
		console.warn('[heic] Native decode returned invalid dimensions:', bitmap.width, bitmap.height);
		bitmap.close();
		return null;
	} catch (err) {
		console.warn('[heic] Native decode failed, will try heic2any:', err);
		return null;
	}
}

/**
 * Render an ImageBitmap to a canvas and export as the target format.
 */
function bitmapToBlob(
	bitmap: ImageBitmap,
	toType: 'image/png' | 'image/jpeg',
	quality: number
): Promise<Blob> {
	const canvas = document.createElement('canvas');
	canvas.width = bitmap.width;
	canvas.height = bitmap.height;

	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('2D context unavailable');

	// For JPEG, fill with white background first (transparency → white)
	if (toType === 'image/jpeg') {
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(0, 0, canvas.width, canvas.height);
	}

	ctx.drawImage(bitmap, 0, 0);
	bitmap.close();

	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(b) => {
				if (!b) reject(new Error('Failed to encode image'));
				else resolve(b);
			},
			toType,
			quality
		);
	});
}

/**
 * Use heic2any library as a fallback for browsers without native HEIC support.
 */
async function decodeWithHeic2any(
	blob: Blob,
	toType: 'image/png' | 'image/jpeg',
	quality: number
): Promise<Blob> {
	// heic2any is big (~332kB gz), so keep it out of the initial bundle.
	const mod = await import('heic2any');
	const heic2any: any = (mod as any).default ?? mod;

	try {
		const out = await heic2any({
			blob,
			toType,
			quality
		});

		// Some HEIF containers can produce multiple images -> heic2any may return Blob[]
		if (Array.isArray(out)) {
			if (!out.length) throw new Error('HEIC conversion produced no output.');
			return out[0] as Blob;
		}
		return out as Blob;
	} catch (err) {
		console.error('[heic] heic2any conversion failed:', err);
		throw err;
	}
}

export async function heicToBlob(
	file: Blob,
	toType: 'image/png' | 'image/jpeg',
	quality = 0.92
): Promise<Blob> {
	// Strategy: Try native decode first (Safari, pre-converted files), then heic2any fallback.
	// This fixes Safari which has native HEIC support and may pre-convert in file picker.

	// 1. Try native createImageBitmap (works on Safari, or if macOS pre-converted to JPEG)
	const nativeBitmap = await tryNativeDecode(file);
	if (nativeBitmap) {
		try {
			return await bitmapToBlob(nativeBitmap, toType, quality);
		} catch (err) {
			console.error('[heic] Native decode bitmapToBlob failed:', err);
			// Don't throw - fall through to heic2any as last resort
		}
	}

	// 2. Fall back to heic2any for browsers without native HEIC support (Chrome, Firefox)
	return decodeWithHeic2any(file, toType, quality);
}
