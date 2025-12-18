<script>
	import { fade } from 'svelte/transition';
	import AdSlot from '$lib/components/AdSlot.svelte';

	let file = /** @type {File | null} */ (null);
	let isProcessing = false;
	let errorMessage = '';

	const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50MB, aligned with backend

	function handleFile(event) {
		const input = event.currentTarget;
		const selected = input.files && input.files[0] ? input.files[0] : null;
		if (!selected) {
			file = null;
			errorMessage = '';
			return;
		}

		const name = selected.name.toLowerCase();
		const isZip = name.endsWith('.zip');
		const isPdf = name.endsWith('.pdf');

		if (!isZip && !isPdf) {
			file = null;
			errorMessage = 'Please upload a PDF or a ZIP containing PDFs.';
			return;
		}

		if (selected.size > MAX_UPLOAD_BYTES) {
			file = null;
			errorMessage = 'File too large. Max 50MB.';
			return;
		}

		file = selected;
		errorMessage = '';
	}

	async function process() {
		if (!file) return;
		isProcessing = true;
		errorMessage = '';

		const formData = new FormData();
		formData.append('file', file);

		try {
			const res = await fetch('/api/pdf_extract', { method: 'POST', body: formData });
			if (!res.ok) {
				let message = 'Extraction failed';
				try {
					const data = await res.json();
					if (data.error) message = data.error;
				} catch (_) {
					// ignore JSON errors
				}
				throw new Error(message);
			}

			const blob = await res.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = 'pdf_text_dump.zip';
			a.click();
			window.URL.revokeObjectURL(url);
		} catch (e) {
			// eslint-disable-next-line no-console
			console.error(e);
			errorMessage = e.message || 'Extraction failed';
		} finally {
			isProcessing = false;
		}
	}
</script>

<svelte:head>
	<title>Bulk PDF Text Extractor | TinyUtils</title>
	<meta
		name="description"
		content="Upload a PDF or a ZIP of PDFs and download a ZIP of plain text files. Perfect for researchers, legal teams, and AI data preparation."
	/>
	<link rel="canonical" href="/tools/pdf-text-extractor/" />
</svelte:head>

<div class="tool-page">
	<section class="tool-hero">
		<span class="tool-hero-icon" aria-hidden="true">📑</span>
		<h1>Bulk PDF Text Extractor</h1>
		<p class="tool-hero-subtitle">
			Upload a single PDF or a ZIP of PDFs and get a ZIP of text files.
		</p>
		<p><a class="cta" href="/tools/">← Back to all tools</a></p>
	</section>

	<section class="container ad-slot" aria-label="Sponsored">
		<ins
			class="adsbygoogle"
			style="display:block"
			data-ad-client="ca-pub-3079281180008443"
			data-ad-slot="3664281983"
			data-ad-format="auto"
			data-full-width-responsive="true"
		></ins>
		<svelte:element this={'script'}>
			{`
				try { (adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
			`}
		</svelte:element>
	</section>

	<section class="card">
		<!-- Upload area -->
		<label class="dropzone">
			<input
				type="file"
				accept=".pdf,.zip,application/pdf,application/zip"
				class="dropzone-input"
				data-testid="pdf-extract-upload-input"
				on:change={handleFile}
			/>
			<div class="dropzone-content">
				{#if file}
					<div class="file-selected">📄 {file.name}</div>
					<div class="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
				{:else}
					<span class="dropzone-icon">📑</span>
					<p class="dropzone-title">Drag &amp; drop a PDF or a ZIP of PDFs</p>
					<p class="dropzone-hint">Accepted: .pdf, .zip • Max 50MB • Up to 50 files</p>
				{/if}
			</div>
		</label>

		<button
			class="btn primary full-width"
			type="button"
			data-testid="pdf-extract-run-button"
			disabled={!file || isProcessing}
			on:click={process}
		>
			{#if isProcessing}
				<span class="spinner-inline">⚙️</span>
				Extracting text…
			{:else}
				Download text files (.zip)
			{/if}
		</button>

		{#if errorMessage}
			<div class="error" transition:fade role="status" aria-live="polite">
				⚠️ {errorMessage}
			</div>
		{/if}

		<p class="note">
			This tool extracts text from digital PDFs. Scanned image-only PDFs without a text layer
			will produce little or no output.
		</p>
	</section>

	<div class="ad-container">
		<AdSlot slot="2563094163" format="horizontal" />
	</div>
</div>

<style>
	/* ═══════════════════════════════════════════════════════════
	   LIQUID GLASS PDF TEXT EXTRACTOR
	   ═══════════════════════════════════════════════════════════ */

	.tool-page {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
		padding-bottom: var(--space-10);
	}

	.tool-hero {
		text-align: center;
		padding: var(--space-12) 0 var(--space-8);
	}

	.tool-hero-icon {
		font-size: 3.5rem;
		display: block;
		margin-bottom: var(--space-4);
	}

	.tool-hero h1 {
		font-size: clamp(2rem, 5vw, 3rem);
		font-weight: var(--font-bold);
		background: var(--accent-gradient);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
		margin-bottom: var(--space-3);
		letter-spacing: -0.02em;
	}

	.tool-hero-subtitle {
		max-width: 720px;
		margin: 0 auto;
		color: var(--text-secondary);
		font-size: 0.98rem;
	}

	/* Glass card */
	.card {
		position: relative;
		border-radius: var(--radius-2xl);
		border: 1px solid var(--glass-border);
		background: var(--glass-bg);
		backdrop-filter: blur(var(--glass-blur));
		-webkit-backdrop-filter: blur(var(--glass-blur));
		padding: var(--space-6);
		overflow: hidden;
		transition: all 0.3s ease;
	}

	.card::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 1px;
		background: linear-gradient(90deg, transparent, var(--glass-highlight), transparent);
		opacity: 0.6;
	}

	.card::after {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 40%;
		background: var(--glass-shine);
		pointer-events: none;
		opacity: 0.3;
	}

	.card:hover {
		border-color: var(--accent-primary);
		box-shadow: 0 12px 40px var(--glass-shadow);
	}

	:global(html[data-theme="light"]) .card {
		box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06),
					inset 0 1px 0 rgba(255, 255, 255, 0.9);
	}

	:global(html[data-theme="light"]) .card::after {
		background: linear-gradient(180deg, rgba(255, 255, 255, 0.7) 0%, transparent 100%);
		opacity: 1;
	}

	/* Glass dropzone */
	.dropzone {
		position: relative;
		display: block;
		border: 2px dashed var(--glass-border);
		border-radius: var(--radius-xl);
		background: var(--glass-bg);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		padding: var(--space-10);
		text-align: center;
		transition: all 0.2s ease;
		cursor: pointer;
		margin-bottom: var(--space-6);
		z-index: 1;
	}

	.dropzone:hover {
		border-color: #ef4444;
		background: rgba(239, 68, 68, 0.05);
	}

	.dropzone-input {
		display: none;
	}

	.dropzone-icon {
		font-size: 3rem;
		display: block;
		margin-bottom: var(--space-4);
	}

	.dropzone-title {
		font-weight: var(--font-medium);
		font-size: 1.1rem;
		color: var(--text-primary);
		margin-bottom: var(--space-2);
	}

	.dropzone-hint {
		font-size: 0.85rem;
		color: var(--text-tertiary);
	}

	.file-selected {
		font-weight: var(--font-bold);
		font-size: 1.1rem;
		color: #ef4444;
		margin-bottom: var(--space-2);
	}

	.file-size {
		font-size: 0.9rem;
		color: var(--text-secondary);
	}

	/* Full width button */
	.full-width {
		width: 100%;
		position: relative;
		z-index: 1;
	}

	.spinner-inline {
		display: inline-block;
		animation: spin 1s linear infinite;
		margin-right: var(--space-2);
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	/* Error state */
	.error {
		margin-top: var(--space-4);
		padding: var(--space-3);
		border-radius: var(--radius-lg);
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		color: #f87171;
		font-size: 0.9rem;
		position: relative;
		z-index: 1;
	}

	/* Note */
	.note {
		margin-top: var(--space-6);
		text-align: center;
		font-size: 0.9rem;
		color: var(--text-tertiary);
		position: relative;
		z-index: 1;
	}

	.ad-container {
		margin-top: var(--space-6);
	}
</style>
