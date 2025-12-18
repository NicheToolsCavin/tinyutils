<script>
	import { fade } from 'svelte/transition';
	import AdSlot from '$lib/components/AdSlot.svelte';

	let file = /** @type {File | null} */ (null);
	let mode = 'json_to_csv'; // 'json_to_csv' | 'csv_to_json'
	let isProcessing = false;
	let errorMessage = '';
	let fileSnippet = '';

	function handleFile(event) {
		const input = event.currentTarget;
		file = input.files && input.files[0] ? input.files[0] : null;
		errorMessage = '';
		fileSnippet = '';

		if (file) {
			const reader = new FileReader();
			reader.onload = (e) => {
				const text = /** @type {string} */ (e.target?.result || '');
				fileSnippet = text.substring(0, 300) + (text.length > 300 ? '…' : '');
			};
			reader.readAsText(file);
		}
	}

	async function convert() {
		if (!file) return;
		isProcessing = true;
		errorMessage = '';

		const formData = new FormData();
		formData.append('file', file);
		formData.append('mode', mode);

		try {
			const res = await fetch('/api/json_tools', { method: 'POST', body: formData });
			if (!res.ok) {
				let message = 'Conversion failed';
				try {
					const data = await res.json();
					if (data.error) message = data.error;
				} catch (_) {
					// ignore JSON parsing errors
				}
				throw new Error(message);
			}

			const blob = await res.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = mode === 'json_to_csv' ? 'data.csv' : 'data.json';
			a.click();
			window.URL.revokeObjectURL(url);
		} catch (e) {
			// eslint-disable-next-line no-console
			console.error(e);
			errorMessage = e.message || 'Conversion failed';
		} finally {
			isProcessing = false;
		}
	}

	function switchMode(nextMode) {
		mode = nextMode;
		file = null;
		fileSnippet = '';
		errorMessage = '';
	}
</script>

<svelte:head>
	<title>Smart JSON ↔ CSV Converter | TinyUtils</title>
	<meta
		name="description"
		content="Convert nested JSON and JSONL logs into clean CSV tables, or turn CSV files back into JSON arrays. Handles flattening and large files up to 50MB."
	/>
	<link rel="canonical" href="/tools/json-to-csv/" />
</svelte:head>

<div class="tool-page">
	<section class="tool-hero">
		<span class="tool-hero-icon" aria-hidden="true">🔄</span>
		<h1>Smart JSON ↔ CSV Converter</h1>
		<p class="tool-hero-subtitle">
			Flatten nested JSON into spreadsheet-friendly CSV, or convert CSV back into JSON arrays.
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
		<!-- Mode switcher -->
		<div class="mode-switcher">
			<div class="mode-tabs">
				<button
					type="button"
					class="mode-tab"
					class:active={mode === 'json_to_csv'}
					on:click={() => switchMode('json_to_csv')}
				>
					JSON to CSV
				</button>
				<button
					type="button"
					class="mode-tab"
					class:active={mode === 'csv_to_json'}
					on:click={() => switchMode('csv_to_json')}
				>
					CSV to JSON
				</button>
			</div>
		</div>

		<!-- Upload area -->
		<label class="dropzone">
			<input
				type="file"
				accept={mode === 'json_to_csv' ? '.json,.jsonl,.ndjson' : '.csv,.tsv,.txt'}
				class="dropzone-input"
				data-testid="jsoncsv-upload-input"
				on:change={handleFile}
			/>
			<div class="dropzone-content">
				{#if file}
					<div class="file-selected">📄 {file.name}</div>
					<div class="file-snippet">{fileSnippet}</div>
				{:else}
					<span class="dropzone-icon">{mode === 'json_to_csv' ? '{ }' : '▦'}</span>
					<p class="dropzone-title">
						Upload {mode === 'json_to_csv' ? 'JSON (.json / .jsonl)' : 'CSV / TSV'} file
					</p>
					<p class="dropzone-hint">Max 50MB • Nested JSON supported</p>
				{/if}
			</div>
		</label>

		<!-- Convert action -->
		<button
			class="btn primary full-width"
			type="button"
			data-testid="jsoncsv-convert-button"
			disabled={!file || isProcessing}
			on:click={convert}
		>
			{#if isProcessing}
				<span class="spinner-inline">⚙️</span>
				Converting…
			{:else}
				Download converted file
			{/if}
		</button>

		{#if errorMessage}
			<div class="error" transition:fade role="status" aria-live="polite">
				⚠️ {errorMessage}
			</div>
		{/if}
	</section>

	<div class="tips">
		<p>
			<strong>JSON → CSV:</strong> nested properties become columns like <code>user.id</code>, <code>meta.country</code>, and arrays are joined with a <code>|</code> separator.
		</p>
		<p>
			<strong>CSV → JSON:</strong> each row becomes a JSON object using the header row as keys.
		</p>
	</div>

	<div class="ad-container">
		<AdSlot slot="2563094163" format="horizontal" />
	</div>
</div>

<style>
	/* ═══════════════════════════════════════════════════════════
	   LIQUID GLASS JSON/CSV CONVERTER
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

	/* Mode switcher */
	.mode-switcher {
		display: flex;
		justify-content: center;
		margin-bottom: var(--space-6);
		position: relative;
		z-index: 1;
	}

	.mode-tabs {
		display: inline-flex;
		padding: 4px;
		border-radius: var(--radius-lg);
		background: var(--glass-bg);
		border: 1px solid var(--glass-border);
	}

	.mode-tab {
		padding: var(--space-2) var(--space-4);
		border-radius: var(--radius-md);
		font-size: 0.9rem;
		font-weight: var(--font-medium);
		color: var(--text-tertiary);
		background: transparent;
		border: none;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.mode-tab:hover {
		color: var(--text-primary);
	}

	.mode-tab.active {
		background: var(--glass-bg-hover);
		color: var(--accent-primary);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	:global(html[data-theme="light"]) .mode-tab.active {
		background: rgba(255, 255, 255, 0.9);
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
		padding: var(--space-8);
		text-align: center;
		transition: all 0.2s ease;
		cursor: pointer;
		margin-bottom: var(--space-6);
		z-index: 1;
	}

	.dropzone:hover {
		border-color: var(--accent-primary);
		background: var(--glass-bg-hover);
	}

	.dropzone-input {
		display: none;
	}

	.dropzone-icon {
		font-size: 2.5rem;
		display: block;
		margin-bottom: var(--space-3);
		font-family: var(--font-mono);
		color: var(--text-tertiary);
	}

	.dropzone-title {
		font-weight: var(--font-medium);
		color: var(--text-primary);
		margin-bottom: var(--space-1);
	}

	.dropzone-hint {
		font-size: 0.85rem;
		color: var(--text-tertiary);
	}

	.file-selected {
		font-weight: var(--font-bold);
		font-size: 1.1rem;
		color: var(--accent-primary);
		margin-bottom: var(--space-3);
	}

	.file-snippet {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		text-align: left;
		padding: var(--space-2);
		border-radius: var(--radius-md);
		background: var(--glass-bg);
		border: 1px solid var(--glass-border);
		color: var(--text-secondary);
		max-height: 8rem;
		overflow: hidden;
		white-space: pre-wrap;
		word-break: break-all;
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

	/* Tips */
	.tips {
		font-size: 0.85rem;
		color: var(--text-tertiary);
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.tips strong {
		color: var(--text-secondary);
	}

	.tips code {
		font-family: var(--font-mono);
		font-size: 0.8rem;
		padding: 2px 6px;
		border-radius: 4px;
		background: var(--glass-bg);
		border: 1px solid var(--glass-border);
	}

	.ad-container {
		margin-top: var(--space-6);
	}
</style>
