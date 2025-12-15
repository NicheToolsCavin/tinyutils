import type { ImageToolSettings } from './types';
import { clamp } from './types';
import type { ImageWorkerPool } from './worker-pool';

export interface ProcessResult {
	blob: Blob;
	type: string;
	inputWidth: number;
	inputHeight: number;
	outputWidth: number;
	outputHeight: number;
}

async function decodeToImageBitmap(blob: Blob): Promise<ImageBitmap> {
	try {
		return await createImageBitmap(blob, { imageOrientation: 'from-image' as any });
	} catch {
		return await createImageBitmap(blob);
	}
}

function setSmoothing(ctx: CanvasRenderingContext2D) {
	ctx.imageSmoothingEnabled = true;
	// Safari supports imageSmoothingQuality as well.
	// @ts-ignore
	if (typeof ctx.imageSmoothingQuality !== 'undefined') ctx.imageSmoothingQuality = 'high';
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

function drawBitmapToCanvas(bitmap: ImageBitmap): HTMLCanvasElement {
	const canvas = document.createElement('canvas');
	canvas.width = bitmap.width;
	canvas.height = bitmap.height;

	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('2D context unavailable');
	setSmoothing(ctx);
	ctx.drawImage(bitmap, 0, 0);

	return canvas;
}

function resizeCanvasMultiStep(
	source: HTMLCanvasElement,
	targetW: number,
	targetH: number,
	highQuality: boolean
): HTMLCanvasElement {
	let cur = source;

	const shrinkALot = targetW < cur.width * 0.5 || targetH < cur.height * 0.5;

	if (highQuality && shrinkALot) {
		// Progressive downscale by halves until we're near the target
		while (cur.width * 0.5 > targetW || cur.height * 0.5 > targetH) {
			const nextW = Math.max(targetW, Math.floor(cur.width * 0.5));
			const nextH = Math.max(targetH, Math.floor(cur.height * 0.5));
			const tmp = document.createElement('canvas');
			tmp.width = nextW;
			tmp.height = nextH;
			const tctx = tmp.getContext('2d');
			if (!tctx) throw new Error('2D context unavailable');
			setSmoothing(tctx);
			tctx.drawImage(cur, 0, 0, cur.width, cur.height, 0, 0, nextW, nextH);
			cur = tmp;
		}
	}

	if (cur.width !== targetW || cur.height !== targetH) {
		const out = document.createElement('canvas');
		out.width = targetW;
		out.height = targetH;
		const octx = out.getContext('2d');
		if (!octx) throw new Error('2D context unavailable');
		setSmoothing(octx);
		octx.drawImage(cur, 0, 0, cur.width, cur.height, 0, 0, targetW, targetH);
		return out;
	}

	return cur;
}

function canvasToBlob(
	canvas: HTMLCanvasElement,
	type: string,
	quality: number | undefined
): Promise<Blob> {
	return new Promise((resolve, reject) => {
		const q = quality === undefined ? undefined : clamp(quality, 0.05, 1);
		canvas.toBlob(
			(blob) => {
				if (!blob) reject(new Error('Failed to encode image.'));
				else resolve(blob);
			},
			type,
			q
		);
	});
}

export async function processImageInMainThread(
	inputBlob: Blob,
	name: string,
	inputType: string,
	settings: ImageToolSettings,
	outputMime: string
): Promise<ProcessResult> {
	const bitmap = await decodeToImageBitmap(inputBlob);
	const inputW = bitmap.width;
	const inputH = bitmap.height;

	const { w: targetW, h: targetH } = computeTargetSize(inputW, inputH, settings);

	const sourceCanvas = drawBitmapToCanvas(bitmap);
	const resizedCanvas =
		targetW === inputW && targetH === inputH
			? sourceCanvas
			: resizeCanvasMultiStep(sourceCanvas, targetW, targetH, settings.highQualityResize);

	// JPEG background fill
	let encodeCanvas = resizedCanvas;
	if (outputMime === 'image/jpeg') {
		const tmp = document.createElement('canvas');
		tmp.width = resizedCanvas.width;
		tmp.height = resizedCanvas.height;
		const ctx = tmp.getContext('2d');
		if (!ctx) throw new Error('2D context unavailable');
		setSmoothing(ctx);
		ctx.fillStyle = settings.jpegBackground;
		ctx.fillRect(0, 0, tmp.width, tmp.height);
		ctx.drawImage(resizedCanvas, 0, 0);
		encodeCanvas = tmp;
	}

	const outBlob =
		outputMime === 'image/jpeg' || outputMime === 'image/webp'
			? await canvasToBlob(encodeCanvas, outputMime, settings.quality)
			: await canvasToBlob(encodeCanvas, outputMime, undefined);

	bitmap.close();

	return {
		blob: outBlob,
		type: outBlob.type || outputMime,
		inputWidth: inputW,
		inputHeight: inputH,
		outputWidth: targetW,
		outputHeight: targetH
	};
}

export async function processImageWithWorker(
	pool: ImageWorkerPool,
	inputBlob: Blob,
	name: string,
	inputType: string,
	settings: ImageToolSettings,
	outputMime: string
): Promise<ProcessResult> {
	const ab = await inputBlob.arrayBuffer();
	const res = await pool.process({ name, inputType, buffer: ab }, settings, outputMime);
	const blob = new Blob([res.outputBuffer], { type: res.outputType });

	return {
		blob,
		type: res.outputType,
		inputWidth: res.inputWidth,
		inputHeight: res.inputHeight,
		outputWidth: res.outputWidth,
		outputHeight: res.outputHeight
	};
}
