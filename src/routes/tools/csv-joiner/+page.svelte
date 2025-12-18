<script>
	import { fade, slide } from 'svelte/transition';
	import AdSlot from '$lib/components/AdSlot.svelte';

	let files = /** @type {File[]} */ ([]);
	let step = 1; // 1: Upload, 2: Configure, 3: Processing
	let fileData = /** @type {Array<{ id: number; delimiter?: string; headers?: string[]; error?: string }>} */ ([]);

	// Join configuration
	let joinKeyA = 0;
	let joinKeyB = 0;
	let joinType = 'inner'; // 'inner' | 'left'
	let errorMsg = '';

	async function handleScan() {
		if (!files || files.length !== 2) {
			errorMsg = 'Please upload exactly two CSV files.';
			return;
		}

		step = 2; // Show config once scan completes
		errorMsg = '';

		const formData = new FormData();
		formData.append('action', 'scan');
		formData.append('files', files[0]);
		formData.append('files', files[1]);

		try {
			const res = await fetch('/api/csv_join', { method: 'POST', body: formData });
			const data = await res.json();

			if (!res.ok || data.error) {
				throw new Error(data.error || 'Failed to scan CSV headers');
			}

			fileData = data.files || [];
			if (fileData.length !== 2) {
				throw new Error('Unexpected response from server while scanning files');
			}

			const headersA = fileData[0].headers ?? [];
			const headersB = fileData[1].headers ?? [];

			// Auto-detect a common header name if possible
			const common = headersA.find((h) => headersB.includes(h));
			if (common) {
				joinKeyA = headersA.indexOf(common);
				joinKeyB = headersB.indexOf(common);
			} else {
				joinKeyA = 0;
				joinKeyB = 0;
			}
		} catch (e) {
			// eslint-disable-next-line no-console
			console.error(e);
			errorMsg = e.message || 'Failed to scan files';
			step = 1;
		}
	}

	async function handleJoin() {
		if (!files || files.length !== 2 || fileData.length !== 2) return;

		step = 3;
		errorMsg = '';

		const formData = new FormData();
		formData.append('action', 'join');
		formData.append('files', files[0]);
		formData.append('files', files[1]);
		formData.append('col_a_idx', String(joinKeyA));
		formData.append('col_b_idx', String(joinKeyB));
		formData.append('delim_a', fileData[0].delimiter || ',');
		formData.append('delim_b', fileData[1].delimiter || ',');
		formData.append('join_type', joinType);

		try {
			const res = await fetch('/api/csv_join', { method: 'POST', body: formData });
			if (!res.ok) {
				let message = 'Join failed';
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
			a.download = 'merged_data.csv';
			a.click();
			window.URL.revokeObjectURL(url);
			step = 2; // Back to config so user can tweak and re-run
		} catch (e) {
			// eslint-disable-next-line no-console
			console.error(e);
			errorMsg = e.message || 'Failed to merge files';
			step = 2;
		}
	}

	function reset() {
		files = [];
		fileData = [];
		joinKeyA = 0;
		joinKeyB = 0;
		joinType = 'inner';
		errorMsg = '';
		step = 1;
	}
</script>

<svelte:head>
	<title>Big CSV Joiner – Merge Two CSV Files by Column | TinyUtils</title>
	<meta
		name="description"
		content="Merge two large CSV files by a common column (like Email or ID). Supports inner and left joins with automatic delimiter and header detection."
	/>
	<link rel="canonical" href="/tools/csv-joiner/" />
</svelte:head>

<div class="tool-page">
	<section class="tool-hero">
		<span class="tool-hero-icon" aria-hidden="true">📊</span>
		<h1>Big CSV Joiner</h1>
		<p class="tool-hero-subtitle">
			Merge two CSV files like a database JOIN – without crashing Excel.
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
		<!-- Step 1: Upload -->
		{#if step === 1}
			<div in:fade>
				<h2 data-testid="csv-joiner-step-heading">1. Upload two files to join</h2>
				<div class="dropzone">
					<input
						type="file"
						accept=".csv,.tsv,.txt"
						multiple
						class="dropzone-input"
						data-testid="csv-joiner-upload-input"
						on:change={(e) => {
							files = Array.from(e.currentTarget.files ?? []).slice(0, 2);
							if (files.length === 2) handleScan();
						}}
					/>
					<div class="dropzone-content">
						<span class="dropzone-icon">📄 + 📄</span>
						<p class="dropzone-title">Drag &amp; drop 2 CSV/TSV files here</p>
						<p class="dropzone-hint">Max 50MB per file • Auto delimiter detection</p>
					</div>
				</div>
			</div>
		{/if}

		<!-- Step 2: Configure join once headers are known -->
		{#if step === 2 && fileData.length === 2}
			<div in:slide>
				<div class="step-header">
					<h2>2. Configure join</h2>
					<button type="button" class="btn ghost" on:click={reset}>Reset</button>
				</div>

				<div class="files-grid">
					<!-- File A -->
					<div class="file-card file-card-a">
						<div class="file-name">{files[0]?.name}</div>
						<p class="file-delimiter">Detected delimiter: {fileData[0].delimiter || ','}</p>
						<label class="field-label" for="matchColumnA">Match column</label>
						<select id="matchColumnA" class="input" bind:value={joinKeyA}>
							{#each fileData[0].headers || [] as h, i}
								<option value={i}>{h}</option>
							{/each}
						</select>
					</div>

					<!-- File B -->
					<div class="file-card file-card-b">
						<div class="file-name">{files[1]?.name}</div>
						<p class="file-delimiter">Detected delimiter: {fileData[1].delimiter || ','}</p>
						<label class="field-label" for="matchColumnB">Match column</label>
						<select id="matchColumnB" class="input" bind:value={joinKeyB}>
							{#each fileData[1].headers || [] as h, i}
								<option value={i}>{h}</option>
							{/each}
						</select>
					</div>
				</div>

				<!-- Join type selector -->
				<fieldset class="join-type-fieldset">
					<legend class="field-label">Join type</legend>
					<div class="join-options">
						<label class="join-option" class:selected={joinType === 'inner'}>
							<input type="radio" bind:group={joinType} value="inner" />
							<div>
								<div class="join-option-title">Inner join</div>
								<div class="join-option-desc">Only rows that match in both files.</div>
							</div>
						</label>

						<label class="join-option" class:selected={joinType === 'left'}>
							<input type="radio" bind:group={joinType} value="left" />
							<div>
								<div class="join-option-title">Left join (VLOOKUP)</div>
								<div class="join-option-desc">All rows from file 1, matches from file 2.</div>
							</div>
						</label>
					</div>
				</fieldset>

				<button type="button" class="btn primary full-width" on:click={handleJoin}>
					Merge files
				</button>
			</div>
		{/if}

		<!-- Step 3: Processing indicator -->
		{#if step === 3}
			<div class="processing" in:fade>
				<div class="spinner">⚙️</div>
				<h3>Merging data…</h3>
				<p>Large files may take a few seconds. We keep everything in-memory and do not store uploads.</p>
			</div>
		{/if}

		{#if errorMsg}
			<div class="error" role="status" aria-live="polite">
				⚠️ {errorMsg}
			</div>
		{/if}
	</section>

	<p class="tip">
		Tip: Use a unique ID column (like <code>email</code> or <code>customer_id</code>) in both files for best results.
	</p>

	<div class="ad-container">
		<AdSlot slot="2563094163" format="horizontal" />
	</div>
</div>

<style>
	/* ═══════════════════════════════════════════════════════════
	   LIQUID GLASS CSV JOINER
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

	.card h2,
	.card h3 {
		position: relative;
		z-index: 1;
		color: var(--text-primary);
		font-weight: var(--font-semibold);
		margin-bottom: var(--space-4);
	}

	/* Glass dropzone */
	.dropzone {
		position: relative;
		border: 2px dashed var(--glass-border);
		border-radius: var(--radius-xl);
		background: var(--glass-bg);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		padding: var(--space-8);
		text-align: center;
		transition: all 0.2s ease;
		z-index: 1;
	}

	.dropzone:hover {
		border-color: var(--accent-primary);
		background: var(--glass-bg-hover);
	}

	.dropzone-input {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		opacity: 0;
		cursor: pointer;
	}

	.dropzone-icon {
		font-size: 2.5rem;
		display: block;
		margin-bottom: var(--space-3);
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

	/* Step header */
	.step-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-6);
		position: relative;
		z-index: 1;
	}

	.step-header h2 {
		margin-bottom: 0;
	}

	/* Files grid */
	.files-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
		gap: var(--space-6);
		margin-bottom: var(--space-6);
		position: relative;
		z-index: 1;
	}

	/* Glass file cards */
	.file-card {
		border-radius: var(--radius-xl);
		border: 1px solid var(--glass-border);
		background: var(--glass-bg);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		padding: var(--space-4);
	}

	.file-card-a {
		border-color: rgba(59, 130, 246, 0.3);
		background: rgba(59, 130, 246, 0.08);
	}

	.file-card-b {
		border-color: rgba(168, 85, 247, 0.3);
		background: rgba(168, 85, 247, 0.08);
	}

	:global(html[data-theme="light"]) .file-card-a {
		background: rgba(59, 130, 246, 0.1);
	}

	:global(html[data-theme="light"]) .file-card-b {
		background: rgba(168, 85, 247, 0.1);
	}

	.file-name {
		font-weight: var(--font-bold);
		color: var(--text-primary);
		margin-bottom: var(--space-2);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.file-delimiter {
		font-size: 0.75rem;
		color: var(--text-tertiary);
		margin-bottom: var(--space-3);
	}

	.field-label {
		display: block;
		font-size: 0.75rem;
		font-weight: var(--font-bold);
		text-transform: uppercase;
		color: var(--text-tertiary);
		margin-bottom: var(--space-1);
	}

	/* Glass inputs */
	.input {
		width: 100%;
		border-radius: var(--radius-lg);
		border: 1px solid var(--glass-border);
		background: var(--glass-bg);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		padding: var(--space-2) var(--space-3);
		color: var(--text-primary);
		font-size: 0.9rem;
		transition: all 0.2s ease;
	}

	.input:focus {
		outline: none;
		border-color: var(--accent-primary);
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
	}

	:global(html[data-theme="light"]) .input {
		background: rgba(255, 255, 255, 0.7);
	}

	/* Join type fieldset */
	.join-type-fieldset {
		border: none;
		padding: 0;
		margin: 0 0 var(--space-6) 0;
		position: relative;
		z-index: 1;
	}

	.join-type-fieldset legend {
		margin-bottom: var(--space-3);
	}

	.join-options {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	@media (min-width: 640px) {
		.join-options {
			flex-direction: row;
		}
	}

	.join-option {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-3);
		border-radius: var(--radius-lg);
		border: 1px solid var(--glass-border);
		background: var(--glass-bg);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		cursor: pointer;
		transition: all 0.2s ease;
		flex: 1;
	}

	.join-option:hover {
		background: var(--glass-bg-hover);
	}

	.join-option.selected {
		border-color: var(--accent-primary);
		box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
		background: rgba(59, 130, 246, 0.1);
	}

	.join-option input[type="radio"] {
		accent-color: var(--accent-primary);
	}

	.join-option-title {
		font-weight: var(--font-bold);
		font-size: 0.9rem;
		color: var(--text-primary);
	}

	.join-option-desc {
		font-size: 0.75rem;
		color: var(--text-tertiary);
	}

	/* Full width button */
	.full-width {
		width: 100%;
		position: relative;
		z-index: 1;
	}

	/* Processing state */
	.processing {
		text-align: center;
		padding: var(--space-10) 0;
		position: relative;
		z-index: 1;
	}

	.spinner {
		font-size: 2.5rem;
		animation: spin 1s linear infinite;
		margin-bottom: var(--space-4);
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	.processing h3 {
		font-size: 1.25rem;
		color: var(--text-primary);
		margin-bottom: var(--space-2);
	}

	.processing p {
		font-size: 0.9rem;
		color: var(--text-tertiary);
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

	/* Tip */
	.tip {
		text-align: center;
		font-size: 0.85rem;
		color: var(--text-tertiary);
	}

	.tip code {
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
