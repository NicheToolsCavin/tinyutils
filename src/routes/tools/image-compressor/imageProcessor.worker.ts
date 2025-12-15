import type { WorkerRequest, WorkerResponse, WorkerCapabilities } from './worker-pool';
import type { ImageToolSettings } from './types';

function supportsOffscreenCanvas(): boolean {
	return typeof OffscreenCanvas !== 'undefined' && !!OffscreenCanvas.prototype.getContext;
}

async function canEncode(type: string): Promise<boolean> {
	if (!supportsOffscreenCanvas()) return false;
	const c = new OffscreenCanvas(2, 2);
	const ctx = c.getContext('2d');
	if (!ctx) return false;
	ctx.fillRect(0, 0, 2, 2);

	try {
		const blob = await (c as any).convertToBlob({ type, quality: 0.8 });
		return !!blob && blob.type === type;
	} catch {
		return false;
	}
}

async function getCapabilities(): Promise<WorkerCapabilities> {
	const offscreenCanvas = supportsOffscreenCanvas();
	const [jpeg, png, webp] = await Promise.all([
		canEncode('image/jpeg'),
		canEncode('image/png'),
		canEncode('image/webp')
	]);

	return {
		offscreenCanvas,
		encode: { jpeg, png, webp }
	};
}

function parseColorToRgba(color: string): { r: number; g: number; b: number; a: number } {
	// Very small parser: supports #rgb, #rrggbb, #rrggbbaa
	const c = color.trim();
	if (c.startsWith('#')) {
		const hex = c.slice(1);
		if (hex.length === 3) {
			const r = parseInt(hex[0] + hex[0], 16);
			const g = parseInt(hex[1] + hex[1], 16);
			const b = parseInt(hex[2] + hex[2], 16);
			return { r, g, b, a: 1 };
		}
		if (hex.length === 6 || hex.length === 8) {
			const r = parseInt(hex.slice(0, 2), 16);
			const g = parseInt(hex.slice(2, 4), 16);
			const b = parseInt(hex.slice(4, 6), 16);
			const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
			return { r, g, b, a };
		}
	}
	// fallback white
	return { r: 255, g: 255, b: 255, a: 1 };
}

function setSmoothing(ctx: OffscreenCanvasRenderingContext2D) {
	ctx.imageSmoothingEnabled = true;
	if ('imageSmoothingQuality' in ctx) {
		// @ts-ignore
		ctx.imageSmoothingQuality = 'high';
	}
}

function computeTargetSize(
	inputW: number,
	inputH: number,
	settings: ImageToolSettings
): { w: number; h: number } {
	if (settings.resize.mode === 'none') return { w: inputW, h: inputH };
	const maxW = settings.resize.maxWidth ?? inputW;
	const maxH = settings.resize.maxHeight ?? inputH;

	const scale = Math.min(1, maxW / inputW, maxH / inputH);
	return {
		w: Math.max(1, Math.round(inputW * scale)),
		h: Math.max(1, Math.round(inputH * scale))
	};
}

async function decodeBitmap(blob: Blob): Promise<ImageBitmap> {
	try {
		// Try to respect EXIF orientation if supported
		return await createImageBitmap(blob, { imageOrientation: 'from-image' as any });
	} catch {
		return await createImageBitmap(blob);
	}
}

async function drawResized(
	bitmap: ImageBitmap,
	targetW: number,
	targetH: number,
	settings: ImageToolSettings
): Promise<OffscreenCanvas> {
	const highQ = settings.highQualityResize;
	const inputW = bitmap.width;
	const inputH = bitmap.height;

	// Start by drawing the bitmap to a canvas
	let curCanvas = new OffscreenCanvas(inputW, inputH);
	let curCtx = curCanvas.getContext('2d');
	if (!curCtx) throw new Error('2D context unavailable');
	setSmoothing(curCtx);
	curCtx.drawImage(bitmap, 0, 0);

	let curW = inputW;
	let curH = inputH;

	// Multi-step downscale for better quality if shrinking a lot
	if (highQ) {
		while (curW * 0.5 > targetW || curH * 0.5 > targetH) {
			const nextW = Math.max(targetW, Math.floor(curW * 0.5));
			const nextH = Math.max(targetH, Math.floor(curH * 0.5));
			const nextCanvas = new OffscreenCanvas(nextW, nextH);
			const nextCtx = nextCanvas.getContext('2d');
			if (!nextCtx) throw new Error('2D context unavailable');
			setSmoothing(nextCtx);
			nextCtx.drawImage(curCanvas, 0, 0, curW, curH, 0, 0, nextW, nextH);

			curCanvas = nextCanvas;
			curCtx = nextCtx;
			curW = nextW;
			curH = nextH;
		}
	}

	if (curW !== targetW || curH !== targetH) {
		const outCanvas = new OffscreenCanvas(targetW, targetH);
		const outCtx = outCanvas.getContext('2d');
		if (!outCtx) throw new Error('2D context unavailable');
		setSmoothing(outCtx);
		outCtx.drawImage(curCanvas, 0, 0, curW, curH, 0, 0, targetW, targetH);
		return outCanvas;
	}

	return curCanvas;
}

async function processImage(
	input: { name: string; inputType: string; buffer: ArrayBuffer },
	settings: ImageToolSettings,
	outputMime: string
): Promise<{
	outBlob: Blob;
	outType: string;
	inputWidth: number;
	inputHeight: number;
	outputWidth: number;
	outputHeight: number;
}> {
	if (!supportsOffscreenCanvas()) {
		throw new Error('OffscreenCanvas not supported in this browser/worker.');
	}

	const inBlob = new Blob([input.buffer], { type: input.inputType || 'application/octet-stream' });
	const bitmap = await decodeBitmap(inBlob);

	const inputWidth = bitmap.width;
	const inputHeight = bitmap.height;

	const { w: targetW, h: targetH } = computeTargetSize(inputWidth, inputHeight, settings);
	const canvas = await drawResized(bitmap, targetW, targetH, settings);

	let encodeCanvas: OffscreenCanvas = canvas;

	// Ensure JPEG gets an explicit background so transparency doesn't turn black
	if (outputMime === 'image/jpeg') {
		const bg = parseColorToRgba(settings.jpegBackground);
		const finalCanvas = new OffscreenCanvas(canvas.width, canvas.height);
		const ctx = finalCanvas.getContext('2d');
		if (!ctx) throw new Error('2D context unavailable');
		setSmoothing(ctx);
		ctx.fillStyle = `rgba(${bg.r}, ${bg.g}, ${bg.b}, ${bg.a})`;
		ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
		ctx.drawImage(canvas, 0, 0);
		encodeCanvas = finalCanvas;
	}

	let outBlob: Blob;
	const q = settings.quality;
	if (outputMime === 'image/jpeg' || outputMime === 'image/webp') {
		outBlob = await (encodeCanvas as any).convertToBlob({ type: outputMime, quality: q });
	} else {
		outBlob = await (encodeCanvas as any).convertToBlob({ type: outputMime });
	}

	bitmap.close();

	return {
		outBlob,
		outType: outBlob.type || outputMime,
		inputWidth,
		inputHeight,
		outputWidth: targetW,
		outputHeight: targetH
	};
}

self.onmessage = async (evt: MessageEvent<WorkerRequest>) => {
	const req = evt.data;

	if (req.type === 'ping') {
		const capabilities = await getCapabilities();
		const res: WorkerResponse = { type: 'pong', messageId: req.messageId, ok: true, capabilities };
		self.postMessage(res);
		return;
	}

	if (req.type === 'process') {
		try {
			const result = await processImage(
				{ name: req.name, inputType: req.inputType, buffer: req.buffer },
				req.settings,
				req.outputMime
			);

			const outBuffer = await result.outBlob.arrayBuffer();
			const res: WorkerResponse = {
				type: 'result',
				messageId: req.messageId,
				ok: true,
				outputBuffer: outBuffer,
				outputType: result.outType,
				inputWidth: result.inputWidth,
				inputHeight: result.inputHeight,
				outputWidth: result.outputWidth,
				outputHeight: result.outputHeight
			};

			(self as any).postMessage(res, [outBuffer]);
		} catch (err: any) {
			const res: WorkerResponse = {
				type: 'result',
				messageId: req.messageId,
				ok: false,
				error: err?.message || 'Image processing failed.'
			};
			self.postMessage(res);
		}
	}
};
