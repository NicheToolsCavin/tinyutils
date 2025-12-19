<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import Hero from '$lib/components/Hero.svelte';
	import AdSlot from '$lib/components/AdSlot.svelte';
	import { downloadBlob } from '$lib/utils/download';
	import { DEFAULT_SETTINGS, loadSettings, saveSettings } from './settings';
	import {
		clamp,
		formatBytes,
		guessMimeFromName,
		isHeicFile,
		isSupportedImageFile,
		isZipFile,
		makeId,
		outputExtensionFromMime,
		outputMimeFromFormat,
		replaceExtension,
		sanitizeFilename,
		withSuffixIfNeeded,
		getExtension
	} from './types';
	import type { ImageToolSettings, OutputFormat } from './types';
	import { getCurrentPlan, getLimits } from './limits';
	import { extractZipImages, createZipFromBlobs } from './zip';
	import { heicToBlob } from './heic';
	import { ImageWorkerPool } from './worker-pool';
	import { processImageInMainThread, processImageWithWorker } from './processor';

	type TaskStatus = 'idle' | 'queued' | 'processing' | 'done' | 'error' | 'cancelled';

	type ImageTask = {
		id: string;
		inputFile: File;
		inputName: string;
		inputSize: number;
		inputType: string;
		inputPreviewUrl: string | null;

		status: TaskStatus;
		error: string | null;

		outputBlob: Blob | null;
		outputName: string | null;
		outputSize: number | null;
		outputType: string | null;
		outputPreviewUrl: string | null;

		inputWidth: number | null;
		inputHeight: number | null;
		outputWidth: number | null;
		outputHeight: number | null;
	};

	const plan = getCurrentPlan();
	const limits = getLimits(plan);

	let settings: ImageToolSettings = DEFAULT_SETTINGS;

	let tasks: ImageTask[] = [];
	let errors: string[] = [];
	let warnings: string[] = [];

	let isDragging = false;
	let isProcessing = false;
	let isCancelling = false;
	let cancelRequested = false;

	let workerSupported = false;
	let workerPool: ImageWorkerPool | null = null;
	let workerConcurrency = getDefaultWorkerConcurrency();

	let fileInputEl: HTMLInputElement | null = null;
	let dropzoneEl: HTMLDivElement | null = null;

	$: totalInputBytes = tasks.reduce((sum, t) => sum + t.inputSize, 0);
	$: doneTasks = tasks.filter((t) => t.status === 'done' && t.outputBlob);
	$: totalOutputBytes = doneTasks.reduce((sum, t) => sum + (t.outputSize ?? 0), 0);
	$: savingsPct =
		totalInputBytes > 0 && totalOutputBytes > 0
			? Math.round((1 - totalOutputBytes / totalInputBytes) * 100)
			: 0;

	$: finishedCount = tasks.filter(
		(t) => t.status === 'done' || t.status === 'error' || t.status === 'cancelled'
	).length;
	$: errorCount = tasks.filter((t) => t.status === 'error').length;
	$: cancelledCount = tasks.filter((t) => t.status === 'cancelled').length;

	onMount(async () => {
		settings = loadSettings();
		await initWorkers();
	});

	onDestroy(() => {
		cleanupAllUrls();
		workerPool?.terminate();
	});

	function getDefaultWorkerConcurrency(): number {
		const hc = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;
		// Conservative default (mobile-friendly)
		return Math.min(3, Math.max(1, Math.floor(hc / 2)));
	}

	async function initWorkers(): Promise<void> {
		workerSupported = false;
		workerPool?.terminate();
		workerPool = null;

		try {
			const pool = new ImageWorkerPool(
				new URL('./imageProcessor.worker.ts', import.meta.url),
				workerConcurrency
			);
			const caps = await pool.init();
			if (caps && caps.offscreenCanvas) {
				workerSupported = true;
				workerPool = pool;
			} else {
				pool.terminate();
			}
		} catch {
			workerSupported = false;
			workerPool = null;
		}
	}

	function cleanupAllUrls(): void {
		for (const t of tasks) cleanupTaskUrls(t);
	}

	function cleanupTaskUrls(t: ImageTask): void {
		if (t.inputPreviewUrl) {
			URL.revokeObjectURL(t.inputPreviewUrl);
			t.inputPreviewUrl = null;
		}
		if (t.outputPreviewUrl) {
			URL.revokeObjectURL(t.outputPreviewUrl);
			t.outputPreviewUrl = null;
		}
	}

	function resetMessages(): void {
		errors = [];
		warnings = [];
	}

	function addError(msg: string): void {
		errors = [...errors, msg];
	}

	function addWarning(msg: string): void {
		warnings = [...warnings, msg];
	}

	function onDragEnter(e: DragEvent) {
		e.preventDefault();
		isDragging = true;
	}

	function onDragLeave(e: DragEvent) {
		e.preventDefault();
		if (e.currentTarget === dropzoneEl) isDragging = false;
	}

	function onDragOver(e: DragEvent) {
		e.preventDefault();
	}

	async function onDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
		resetMessages();

		const dt = e.dataTransfer;
		if (!dt?.files?.length) return;
		await addFiles(dt.files);
	}

	async function onFilePick(e: Event) {
		resetMessages();
		const el = e.currentTarget as HTMLInputElement;
		const files = el.files;
		if (!files?.length) return;
		await addFiles(files);
		// allow re-selecting same file
		el.value = '';
	}

	async function onPaste(e: ClipboardEvent) {
		if (isProcessing) return;
		const items = e.clipboardData?.items;
		if (!items?.length) return;

		const pasted: File[] = [];
		for (const item of items) {
			if (item.kind === 'file') {
				const f = item.getAsFile();
				if (f) pasted.push(f);
			}
		}
		if (!pasted.length) return;

		resetMessages();
		await addFiles(pasted);
	}

	function validateFileAgainstLimits(file: File, currentTotalBytes: number): string | null {
		if (file.size > limits.maxFileBytes) {
			return `${file.name} is too large (${formatBytes(file.size)}). Limit: ${formatBytes(
				limits.maxFileBytes
			)}.`;
		}
		if (currentTotalBytes + file.size > limits.maxTotalBytes) {
			return `Adding ${file.name} would exceed your total limit (${formatBytes(
				limits.maxTotalBytes
			)}).`;
		}
		if (isZipFile(file) && !limits.allowZip) {
			return `ZIP upload is not enabled on your plan.`;
		}
		if (isHeicFile(file) && !limits.allowHeic) {
			return `HEIC/HEIF is not enabled on your plan.`;
		}
		return null;
	}

	function makeTaskFromFile(file: File, displayNameOverride?: string): ImageTask {
		const inferredType = file.type || guessMimeFromName(displayNameOverride ?? file.name) || '';
		const inputPreviewUrl = !isZipFile(file) && !isHeicFile(file) ? URL.createObjectURL(file) : null;
		return {
			id: makeId('img'),
			inputFile: file,
			inputName: sanitizeFilename(displayNameOverride ?? file.name),
			inputSize: file.size,
			inputType: inferredType,
			inputPreviewUrl,

			status: 'idle',
			error: null,

			outputBlob: null,
			outputName: null,
			outputSize: null,
			outputType: null,
			outputPreviewUrl: null,

			inputWidth: null,
			inputHeight: null,
			outputWidth: null,
			outputHeight: null
		};
	}

	async function addFiles(files: FileList | File[]) {
		if (isProcessing) {
			addWarning('Processing in progress — wait for it to finish (or cancel) before adding more files.');
			return;
		}

		const arr = Array.from(files);
		let totalBytes = totalInputBytes;

		// Count images already queued
		let imagesQueued = tasks.length;

		for (const file of arr) {
			if (!isSupportedImageFile(file)) {
				addWarning(`Skipped unsupported file: ${file.name}`);
				continue;
			}

			if (isZipFile(file)) {
				if (!limits.allowZip) {
					addWarning(`ZIP upload disabled on your plan; skipped ${file.name}`);
					continue;
				}

				try {
					const extracted = await extractZipImages(file);
					if (!extracted.length) {
						addWarning(`No supported images found in ${file.name}`);
						continue;
					}

					for (const ex of extracted) {
						if (imagesQueued >= limits.maxImages) {
							addWarning(
								`Reached max images (${limits.maxImages}). Some ZIP entries were skipped.`
							);
							break;
						}

						const maybeErr = validateFileAgainstLimits(ex.file, totalBytes);
						if (maybeErr) {
							addWarning(maybeErr);
							continue;
						}

						tasks = [...tasks, makeTaskFromFile(ex.file, ex.name)];
						imagesQueued++;
						totalBytes += ex.file.size;
					}
				} catch (err: any) {
					addError(`Failed to read ZIP: ${err?.message || 'Unknown error'}`);
				}

				continue;
			}

			if (imagesQueued >= limits.maxImages) {
				addWarning(`Reached max images (${limits.maxImages}). Skipped ${file.name}.`);
				continue;
			}

			const maybeErr = validateFileAgainstLimits(file, totalBytes);
			if (maybeErr) {
				addWarning(maybeErr);
				continue;
			}

			tasks = [...tasks, makeTaskFromFile(file)];
			imagesQueued++;
			totalBytes += file.size;
		}
	}

	function clearAll() {
		if (isProcessing) return;
		resetMessages();
		cleanupAllUrls();
		tasks = [];
	}

	function clampInt(v: string): number | null {
		const n = Number(v);
		if (!Number.isFinite(n)) return null;
		const i = Math.floor(n);
		if (i <= 0) return null;
		return i;
	}

	function updateSettings(
		partial: Omit<Partial<ImageToolSettings>, 'resize'> & {
			resize?: Partial<ImageToolSettings['resize']>;
		}
	) {
		settings = {
			...settings,
			...partial,
			resize: { ...settings.resize, ...(partial.resize ?? {}) }
		};
		saveSettings(settings);
	}

	function getPerTaskSavingsPct(t: ImageTask): number | null {
		if (!t.outputSize || !t.inputSize) return null;
		return Math.round((1 - t.outputSize / t.inputSize) * 100);
	}

	async function startProcessing() {
		if (!tasks.length || isProcessing) return;

		resetMessages();
		isProcessing = true;
		isCancelling = false;
		cancelRequested = false;

		// Reset outputs
		for (const t of tasks) {
			if (t.outputPreviewUrl) URL.revokeObjectURL(t.outputPreviewUrl);
			t.outputBlob = null;
			t.outputName = null;
			t.outputSize = null;
			t.outputType = null;
			t.outputPreviewUrl = null;
			t.status = 'queued';
			t.error = null;
			t.inputWidth = null;
			t.inputHeight = null;
			t.outputWidth = null;
			t.outputHeight = null;
		}
		tasks = tasks;

		// Ensure workers are initialized (or fallback)
		if (!workerPool || !workerSupported) {
			await initWorkers();
		}

		const useWorkers = !!workerPool && workerSupported;
		const concurrency = useWorkers ? workerPool!.getSize() : 1;

		const usedOutputNames = new Set<string>();

		const processOne = async (task: ImageTask) => {
			if (cancelRequested) {
				task.status = 'cancelled';
				return;
			}

			task.status = 'processing';
			tasks = tasks;

			try {
				let inputBlob: Blob = task.inputFile;
				let inputType = task.inputType || guessMimeFromName(task.inputName) || '';

				// HEIC decode: convert to PNG or JPEG as an intermediate
				const isHeic = isHeicFile(task.inputFile);
				if (isHeic) {
					const intermediate: 'image/png' | 'image/jpeg' =
						settings.outputFormat === 'jpeg' ? 'image/jpeg' : 'image/png';
					inputBlob = await heicToBlob(task.inputFile, intermediate, 0.92);
					inputType = intermediate;
				}

				let outMime = outputMimeFromFormat(settings.outputFormat, inputType);

				// If workers are available, respect worker encode capabilities
				if (useWorkers && workerPool?.capabilities) {
					if (outMime === 'image/webp' && !workerPool.capabilities.encode.webp) outMime = 'image/jpeg';
					if (outMime === 'image/jpeg' && !workerPool.capabilities.encode.jpeg) outMime = 'image/png';
					if (outMime === 'image/png' && !workerPool.capabilities.encode.png) outMime = 'image/jpeg';
				}

				const result = useWorkers
					? await processImageWithWorker(workerPool!, inputBlob, task.inputName, inputType, settings, outMime)
					: await processImageInMainThread(inputBlob, task.inputName, inputType, settings, outMime);

				task.outputBlob = result.blob;
				task.outputType = result.type;
				task.outputSize = result.blob.size;

				task.inputWidth = result.inputWidth;
				task.inputHeight = result.inputHeight;
				task.outputWidth = result.outputWidth;
				task.outputHeight = result.outputHeight;

				const outExt = outputExtensionFromMime(result.type) ?? getExtension(task.inputName) ?? 'img';
				const baseName = sanitizeFilename(task.inputName);
				const proposedName = replaceExtension(baseName, outExt);
				task.outputName = withSuffixIfNeeded(proposedName, usedOutputNames);
				usedOutputNames.add(task.outputName);

				task.outputPreviewUrl = URL.createObjectURL(task.outputBlob);

				task.status = 'done';
			} catch (err: any) {
				if (cancelRequested) {
					task.status = 'cancelled';
				} else {
					task.status = 'error';
					task.error = err?.message || 'Processing failed.';
				}
			}
		};

		// Concurrency-limited runner with batched UI updates
		let idx = 0;
		let processedCount = 0;
		const BATCH_SIZE = 5; // Update UI every 5 images instead of every image

		const runners = Array.from({ length: concurrency }, async () => {
			while (true) {
				const i = idx++;
				if (i >= tasks.length) break;

				await processOne(tasks[i]);
				processedCount++;

				// Batch UI updates: only trigger reactivity every BATCH_SIZE files
				if (processedCount % BATCH_SIZE === 0) {
					tasks = tasks; // Trigger Svelte reactivity

					// Yield to browser for rendering using requestIdleCallback if available
					if (typeof requestIdleCallback !== 'undefined') {
						await new Promise((resolve) => requestIdleCallback(resolve, { timeout: 50 }));
					} else {
						// Fallback for browsers without requestIdleCallback
						await new Promise((resolve) => setTimeout(resolve, 0));
					}
				}
			}
		});

		await Promise.all(runners);

		// Final update to catch any remaining files not in a complete batch
		tasks = tasks;

		isProcessing = false;
		isCancelling = false;
		cancelRequested = false;
	}

	function cancelProcessing() {
		if (!isProcessing || cancelRequested) return;
		cancelRequested = true;
		isCancelling = true;

		for (const t of tasks) {
			if (t.status === 'queued' || t.status === 'processing') t.status = 'cancelled';
		}
		tasks = tasks;

		workerPool?.terminate();
		workerPool = null;
		workerSupported = false;
	}

	function downloadSingle(task: ImageTask) {
		if (!task.outputBlob || !task.outputName) return;
		const filename = task.outputName.split('/').pop() || task.outputName;
		downloadBlob({ filename, content: task.outputBlob });
	}

	async function downloadAll() {
		const ready = tasks.filter((t) => t.status === 'done' && t.outputBlob && t.outputName) as Array<
			ImageTask & { outputBlob: Blob; outputName: string }
		>;

		if (!ready.length) return;

		if (ready.length === 1) {
			const filename = ready[0].outputName.split('/').pop() || ready[0].outputName;
			downloadBlob({ filename, content: ready[0].outputBlob });
			return;
		}

		try {
			const zipEntries = ready.map((t) => ({ name: t.outputName, blob: t.outputBlob }));
			const zipBlob = await createZipFromBlobs(zipEntries, { level: 6 });
			downloadBlob({ filename: 'tinyutils-image-compressor.zip', content: zipBlob });
		} catch (err: any) {
			addError(`Failed to create ZIP: ${err?.message || 'Unknown error'}`);
		}
	}

	// Reactive statements for button states - Svelte needs these to track dependencies
	// (function calls in templates don't reactively update)
	$: canProcessNow = tasks.length > 0 && !isProcessing;
	$: canDownloadNow = doneTasks.length > 0 && !isProcessing;

	// Keyboard shortcuts
	function handleKeydown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
			e.preventDefault();
			if (canProcessNow) startProcessing();
		}
		if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
			e.preventDefault();
			if (canDownloadNow) downloadAll();
		}
	}

	// Test hook - exposes addFiles for automated testing (dev mode only)
	if (typeof window !== 'undefined' && import.meta.env.DEV) {
		(window as any).__IMAGE_COMPRESSOR_TEST__ = {
			addFiles,
			startProcessing,
			getTasks: () => tasks,
			canProcess: () => canProcessNow
		};
	}
</script>

<svelte:head>
	<title>Image Compressor & Converter - TinyUtils</title>
	<meta
		name="description"
		content="Compress and convert images in your browser. Batch process PNG, JPG, WebP, and HEIC with a quality slider and resize controls. Files never leave your device."
	/>
	<link rel="canonical" href="https://tinyutils.net/tools/image-compressor/" />
</svelte:head>

<svelte:window on:keydown={handleKeydown} on:paste={onPaste} />

<div class="container">
	<Hero
		title="Image Compressor & Converter"
		subtitle="Batch convert PNG/JPG/WebP/HEIC, resize, and compress - 100% in your browser. Files never leave your device."
	/>

	<div class="card tool-card">
		<p class="subtle">
			<strong>Privacy:</strong> images are processed locally in your browser - nothing is uploaded.
		</p>

		<div
			bind:this={dropzoneEl}
			class="dropzone"
			class:dragging={isDragging}
			role="button"
			tabindex={isProcessing ? -1 : 0}
			aria-disabled={isProcessing}
			aria-label="Upload images"
			on:dragenter={onDragEnter}
			on:dragleave={onDragLeave}
			on:dragover={onDragOver}
			on:drop={onDrop}
			on:click={() => {
				if (!isProcessing) {
					// Defer file dialog to next frame for better INP
					requestAnimationFrame(() => fileInputEl?.click());
				}
			}}
			on:keydown={(e) => {
				if (isProcessing) return;
				if (e.key === 'Enter' || e.key === ' ') {
					requestAnimationFrame(() => fileInputEl?.click());
				}
			}}
		>
			<div class="dropzone-inner">
				<div class="drop-title">Drag & drop images or a ZIP</div>
				<div class="drop-subtitle">
					Supports PNG, JPG, WebP, HEIC/HEIF. Batch download as ZIP.
				</div>

				<div class="row wrap center gap-sm mt-md">
					<button
						class="btn primary"
						type="button"
						disabled={isProcessing}
						on:click|stopPropagation={() => {
							if (!isProcessing) {
								requestAnimationFrame(() => fileInputEl?.click());
							}
						}}
					>
						Choose files
					</button>
					<button class="btn" type="button" disabled={isProcessing || tasks.length === 0} on:click|stopPropagation={clearAll}>
						Clear
					</button>
				</div>

				<input
					bind:this={fileInputEl}
					class="sr-only"
					type="file"
					multiple
					accept="image/*,.heic,.heif,.zip"
					on:change={onFilePick}
				/>
			</div>
		</div>

		<div class="settings-grid mt-lg">
			<section class="settings-card">
				<h2 class="settings-title">Output</h2>

				<label class="field">
					<span class="field-label">Format</span>
					<select
						class="input"
						value={settings.outputFormat}
						on:change={(e) =>
							updateSettings({ outputFormat: (e.currentTarget as HTMLSelectElement).value as OutputFormat })
						}
					>
						<option value="webp">WebP (recommended)</option>
						<option value="jpeg">JPG</option>
						<option value="png">PNG (lossless)</option>
						<option value="keep">Keep original format</option>
					</select>
				</label>

				<label class="field">
					<span class="field-label">Quality ({Math.round(settings.quality * 100)})</span>
					<input
						class="input"
						type="range"
						min="40"
						max="95"
						step="1"
						value={Math.round(settings.quality * 100)}
						disabled={settings.outputFormat === 'png'}
						on:input={(e) =>
							updateSettings({ quality: clamp(Number((e.currentTarget as HTMLInputElement).value) / 100, 0.05, 1) })
						}
					/>
					<span class="field-hint">
						Used for JPG/WebP. PNG is lossless (quality slider disabled).
					</span>
				</label>

				<label class="field">
					<span class="field-label">JPEG background (for transparent images)</span>
					<input
						class="input color-input"
						type="color"
						value={settings.jpegBackground}
						on:change={(e) => updateSettings({ jpegBackground: (e.currentTarget as HTMLInputElement).value })}
					/>
				</label>
			</section>

			<section class="settings-card">
				<h2 class="settings-title">Resize</h2>

				<label class="field checkbox">
					<input
						type="checkbox"
						checked={settings.resize.mode === 'fit'}
						on:change={(e) => updateSettings({ resize: { mode: (e.currentTarget as HTMLInputElement).checked ? 'fit' : 'none' } })}
					/>
					<span>Resize to fit within max width/height</span>
				</label>

				<div class="two-col">
					<label class="field">
						<span class="field-label">Max width (px)</span>
						<input
							class="input"
							type="number"
							inputmode="numeric"
							placeholder="e.g. 1920"
							value={settings.resize.maxWidth ?? ''}
							disabled={settings.resize.mode === 'none'}
							on:input={(e) => updateSettings({ resize: { maxWidth: clampInt((e.currentTarget as HTMLInputElement).value) } })}
						/>
					</label>

					<label class="field">
						<span class="field-label">Max height (px)</span>
						<input
							class="input"
							type="number"
							inputmode="numeric"
							placeholder="e.g. 1920"
							value={settings.resize.maxHeight ?? ''}
							disabled={settings.resize.mode === 'none'}
							on:input={(e) => updateSettings({ resize: { maxHeight: clampInt((e.currentTarget as HTMLInputElement).value) } })}
						/>
					</label>
				</div>

				<label class="field checkbox">
					<input
						type="checkbox"
						checked={settings.highQualityResize}
						disabled={settings.resize.mode === 'none'}
						on:change={(e) => updateSettings({ highQualityResize: (e.currentTarget as HTMLInputElement).checked })}
					/>
					<span>High-quality downscale (slower)</span>
				</label>
			</section>

			<section class="settings-card">
				<h2 class="settings-title">Performance</h2>

				<label class="field checkbox">
					<input
						type="checkbox"
						checked={workerSupported}
						on:change={async () => {
							// Toggle workers on/off by forcing re-init with size 1 or actual size.
							if (workerSupported) {
								workerSupported = false;
								workerPool?.terminate();
								workerPool = null;
							} else {
								await initWorkers();
							}
						}}
					/>
					<span>Use background workers (best for large batches)</span>
				</label>

				<label class="field">
					<span class="field-label">Worker threads</span>
					<input
						class="input"
						type="number"
						min="1"
						max="4"
						value={workerConcurrency}
						on:input={(e) => {
							workerConcurrency = clampInt((e.currentTarget as HTMLInputElement).value) ?? 1;
						}}
					/>
					<button class="btn mt-sm" type="button" on:click={() => initWorkers()} disabled={isProcessing}>
						Apply
					</button>
				</label>

				<div class="subtle mt-sm">
					{#if workerSupported}
						Workers enabled
					{:else}
						Workers unavailable - will use main thread fallback.
					{/if}
				</div>
			</section>
		</div>

		<div class="row wrap between gap-sm mt-lg">
			<div class="subtle">
				<strong>{tasks.length}</strong> files | <strong>{formatBytes(totalInputBytes)}</strong> total input
				{#if doneTasks.length > 0}
					| <strong>{formatBytes(totalOutputBytes)}</strong> output ({savingsPct}% smaller)
				{/if}
			</div>

			<div class="row wrap gap-sm">
				<button class="btn primary" type="button" disabled={!canProcessNow} on:click={startProcessing}>
					{isProcessing ? (isCancelling ? 'Cancelling...' : 'Processing...') : 'Process images'}
				</button>

				<button class="btn" type="button" disabled={!isProcessing || isCancelling} on:click={cancelProcessing}>
					{isCancelling ? 'Cancelling...' : 'Cancel'}
				</button>

				<button class="btn" type="button" disabled={!canDownloadNow} on:click={downloadAll}>
					Download {doneTasks.length > 1 ? 'all (ZIP)' : 'file'}
				</button>
			</div>
		</div>

		{#if isProcessing}
			<div class="mt-md" aria-live="polite">
				<progress value={finishedCount} max={tasks.length}></progress>
				<div class="subtle mt-xs">
					Completed {finishedCount} / {tasks.length}
					{#if errorCount > 0} | {errorCount} errors{/if}
					{#if cancelledCount > 0} | {cancelledCount} cancelled{/if}
				</div>
			</div>
		{/if}

		{#if errors.length}
			<div class="alert alert-error mt-md" role="alert">
				<strong>Errors:</strong>
				<ul>
					{#each errors as e}
						<li>{e}</li>
					{/each}
				</ul>
			</div>
		{/if}

		{#if warnings.length}
			<div class="alert alert-warn mt-md" role="status">
				<strong>Notes:</strong>
				<ul>
					{#each warnings as w}
						<li>{w}</li>
					{/each}
				</ul>
			</div>
		{/if}

		{#if tasks.length}
			<h2 class="mt-xl">Files</h2>

			<ul class="file-list">
				{#each tasks as t (t.id)}
					<li class="file-row">
						<div class="thumb">
							{#if t.outputPreviewUrl}
								<img src={t.outputPreviewUrl} alt={`Output preview for ${t.inputName}`} />
							{:else if t.inputPreviewUrl}
								<img src={t.inputPreviewUrl} alt={`Input preview for ${t.inputName}`} />
							{:else}
								<div class="thumb-placeholder" aria-hidden="true">IMG</div>
							{/if}
						</div>

						<div class="file-main">
							<div class="file-name">{t.inputName}</div>
							<div class="subtle">
								{formatBytes(t.inputSize)}
								{#if t.outputSize}
									--> {formatBytes(t.outputSize)}
									{#if getPerTaskSavingsPct(t) !== null}
										<span class="pill">{getPerTaskSavingsPct(t)}% smaller</span>
									{/if}
								{/if}
								{#if t.outputWidth && t.outputHeight}
									<span class="pill">{t.outputWidth} x {t.outputHeight}</span>
								{/if}
							</div>

							{#if t.status === 'error'}
								<div class="subtle error-text">Error: {t.error}</div>
							{:else if t.status === 'processing'}
								<div class="subtle">Processing...</div>
							{:else if t.status === 'queued'}
								<div class="subtle">Queued</div>
							{:else if t.status === 'cancelled'}
								<div class="subtle">Cancelled</div>
							{/if}
						</div>

						<div class="file-actions">
							{#if t.outputBlob && t.outputName}
								<button class="btn" type="button" on:click={() => downloadSingle(t)}>
									Download
								</button>
							{/if}
						</div>
					</li>
				{/each}
			</ul>

			<div class="subtle mt-md">
				<strong>Plan limits ({plan}):</strong>
				{limits.maxImages === Number.POSITIVE_INFINITY ? 'Unlimited' : `${limits.maxImages} images`} |
				{formatBytes(limits.maxFileBytes)} max per file | {formatBytes(limits.maxTotalBytes)} total
			</div>
		{/if}
	</div>

	<div class="shortcuts-hint mt-md">
		<span class="subtle">Shortcuts: <kbd>Ctrl/Cmd + Enter</kbd> to process | <kbd>Ctrl/Cmd + E</kbd> to download</span>
	</div>

	<AdSlot />
</div>

<style>
	/* ═══════════════════════════════════════════════════════════
	   LIQUID GLASS IMAGE COMPRESSOR
	   ═══════════════════════════════════════════════════════════ */

	.tool-card {
		margin-top: 1.5rem;
	}

	.subtle {
		color: var(--text-tertiary);
		font-size: 0.95rem;
	}

	.mt-xs { margin-top: 0.35rem; }
	.mt-sm { margin-top: 0.6rem; }
	.mt-md { margin-top: 1rem; }
	.mt-lg { margin-top: 1.5rem; }
	.mt-xl { margin-top: 2rem; }
	.gap-sm { gap: 0.5rem; }

	.row {
		display: flex;
		align-items: center;
	}

	.wrap { flex-wrap: wrap; }
	.center { justify-content: center; }
	.between { justify-content: space-between; }

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	/* Glass dropzone */
	.dropzone {
		position: relative;
		border: 2px dashed var(--glass-border);
		border-radius: var(--radius-2xl);
		padding: 2rem 1.25rem;
		background: var(--glass-bg);
		backdrop-filter: blur(var(--glass-blur));
		-webkit-backdrop-filter: blur(var(--glass-blur));
		cursor: pointer;
		transition: all 0.3s ease;
		overflow: hidden;
	}

	.dropzone::after {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 50%;
		background: var(--glass-shine);
		pointer-events: none;
		opacity: 0.3;
	}

	.dropzone:hover {
		border-color: var(--accent-primary);
		box-shadow: 0 8px 32px var(--glass-shadow);
	}

	.dropzone.dragging {
		border-color: var(--accent-primary);
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2),
		            0 12px 40px var(--glass-shadow);
	}

	:global(html[data-theme="light"]) .dropzone {
		box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06),
		            inset 0 1px 0 rgba(255, 255, 255, 0.9);
	}

	:global(html[data-theme="light"]) .dropzone::after {
		background: linear-gradient(180deg, rgba(255, 255, 255, 0.7) 0%, transparent 100%);
		opacity: 1;
	}

	.dropzone-inner {
		text-align: center;
		position: relative;
		z-index: 1;
	}

	.drop-title {
		font-weight: var(--font-bold);
		font-size: 1.1rem;
		color: var(--text-primary);
	}

	.drop-subtitle {
		margin-top: 0.35rem;
		color: var(--text-secondary);
	}

	/* Glass settings grid */
	.settings-grid {
		display: grid;
		grid-template-columns: repeat(12, 1fr);
		gap: 1rem;
	}

	.settings-card {
		position: relative;
		grid-column: span 12;
		border: 1px solid var(--glass-border);
		border-radius: var(--radius-xl);
		padding: 1rem;
		background: var(--glass-bg);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		overflow: hidden;
		transition: all 0.3s ease;
	}

	.settings-card::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 1px;
		background: linear-gradient(90deg, transparent, var(--glass-highlight), transparent);
		opacity: 0.6;
	}

	.settings-card:hover {
		border-color: var(--accent-primary);
	}

	:global(html[data-theme="light"]) .settings-card {
		background: rgba(255, 255, 255, 0.5);
		box-shadow: 0 2px 16px rgba(0, 0, 0, 0.05),
		            inset 0 1px 0 rgba(255, 255, 255, 0.9);
	}

	@media (min-width: 900px) {
		.settings-card {
			grid-column: span 4;
		}
	}

	.settings-title {
		font-size: 1rem;
		font-weight: var(--font-semibold);
		color: var(--text-primary);
		margin: 0 0 0.75rem;
		position: relative;
		z-index: 1;
	}

	.field {
		display: block;
		margin-bottom: 0.75rem;
		position: relative;
		z-index: 1;
	}

	.field-label {
		display: block;
		font-size: 0.9rem;
		color: var(--text-secondary);
		margin-bottom: 0.25rem;
	}

	.field-hint {
		display: block;
		font-size: 0.85rem;
		color: var(--text-tertiary);
		margin-top: 0.25rem;
	}

	.field.checkbox {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--text-secondary);
	}

	/* Glass inputs */
	.input {
		width: 100%;
		padding: 0.55rem 0.65rem;
		border-radius: var(--radius-lg);
		border: 1px solid var(--glass-border);
		background: var(--glass-bg);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		color: var(--text-primary);
		transition: all 0.2s ease;
	}

	.input:focus {
		outline: none;
		border-color: var(--accent-primary);
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
	}

	:global(html[data-theme="light"]) .input {
		background: rgba(255, 255, 255, 0.6);
		box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.06);
	}

	select.input {
		height: 2.5rem;
	}

	.color-input {
		width: 4rem;
		height: 2.5rem;
		padding: 0.2rem;
	}

	.two-col {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.75rem;
	}

	/* Glass progress bar */
	progress {
		width: 100%;
		height: 12px;
		border-radius: 6px;
		overflow: hidden;
	}

	progress::-webkit-progress-bar {
		background: var(--glass-border);
		border-radius: 6px;
	}

	progress::-webkit-progress-value {
		background: var(--accent-gradient);
		border-radius: 6px;
	}

	progress::-moz-progress-bar {
		background: var(--accent-gradient);
		border-radius: 6px;
	}

	/* Glass alerts */
	.alert {
		position: relative;
		border-radius: var(--radius-xl);
		padding: 0.9rem 1rem;
		border: 1px solid var(--glass-border);
		background: var(--glass-bg);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
	}

	.alert ul {
		margin: 0.5rem 0 0 1.2rem;
		padding: 0;
		color: var(--text-secondary);
	}

	.alert-error {
		background: rgba(239, 68, 68, 0.1);
		border-color: rgba(239, 68, 68, 0.35);
	}

	.alert-warn {
		background: rgba(251, 146, 60, 0.1);
		border-color: rgba(251, 146, 60, 0.35);
	}

	.error-text {
		color: #fca5a5;
	}

	/* Glass file list */
	.file-list {
		list-style: none;
		padding: 0;
		margin: 0.75rem 0 0;
		display: grid;
		gap: 0.75rem;
	}

	.file-row {
		position: relative;
		display: grid;
		grid-template-columns: 64px 1fr auto;
		gap: 0.75rem;
		align-items: center;
		border: 1px solid var(--glass-border);
		border-radius: var(--radius-xl);
		padding: 0.75rem;
		background: var(--glass-bg);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		transition: all 0.2s ease;
	}

	.file-row:hover {
		border-color: var(--accent-primary);
		box-shadow: 0 4px 16px var(--glass-shadow);
	}

	:global(html[data-theme="light"]) .file-row {
		background: rgba(255, 255, 255, 0.5);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04),
		            inset 0 1px 0 rgba(255, 255, 255, 0.9);
	}

	.thumb {
		width: 64px;
		height: 64px;
		border-radius: var(--radius-lg);
		overflow: hidden;
		border: 1px solid var(--glass-border);
		background: var(--glass-bg);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.thumb-placeholder {
		color: var(--text-tertiary);
		font-weight: var(--font-bold);
		font-size: 0.9rem;
	}

	.file-name {
		font-weight: var(--font-semibold);
		color: var(--text-primary);
		overflow-wrap: anywhere;
	}

	/* Glass pill */
	.pill {
		display: inline-block;
		margin-left: 0.4rem;
		padding: 0.1rem 0.5rem;
		border-radius: var(--radius-full);
		border: 1px solid var(--glass-border);
		background: var(--glass-bg);
		color: var(--text-secondary);
		font-size: 0.8rem;
	}

	.file-actions {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
	}

	.shortcuts-hint {
		text-align: center;
	}

	.shortcuts-hint kbd {
		background: var(--glass-bg);
		border: 1px solid var(--glass-border);
		border-radius: 4px;
		padding: 0.1rem 0.4rem;
		font-size: 0.85rem;
		font-family: var(--font-mono);
	}
</style>
