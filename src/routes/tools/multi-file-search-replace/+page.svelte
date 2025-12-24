<script>
	import { fade, slide } from 'svelte/transition';
	import { onMount } from 'svelte';
	import AdSlot from '$lib/components/AdSlot.svelte';

	// Cloud Run fallback URL for when Vercel Python is broken
	// See: https://github.com/vercel/vercel/issues/14041
	const CLOUD_RUN_BULK_REPLACE_URL = 'https://tinyutils-converter-1086963596430.europe-west1.run.app';

	// State
	let file = null;
	let mode = 'simple'; // 'simple' | 'regex'
	let findText = '';
	let replaceText = '';
	let isCaseSensitive = false;

	// UI State
	let status = 'idle'; // 'idle', 'uploading', 'previewing', 'error'
	let errorMessage = '';
	let previewData = null;

	// Test hook: allow tiny-reactive Tier1 harness to inject
	// a small ZIP fixture without relying on native file dialogs.
	if (typeof window !== 'undefined') {
		window.__mfsrTestSetFileFromBase64 = (fileName, base64) => {
			try {
				const binary = atob(base64);
				const len = binary.length;
				const bytes = new Uint8Array(len);
				for (let i = 0; i < len; i += 1) {
					bytes[i] = binary.charCodeAt(i);
				}
				const blob = new Blob([bytes], { type: 'application/zip' });
				file = new File([blob], fileName, { type: 'application/zip' });
				status = 'idle';
				errorMessage = '';
			} catch (err) {
				console.error('mfsr test hook failed', err);
			}
		};
	}

	// Regex Examples
	const REGEX_EXAMPLES = [
		{
			name: 'Copyright Year',
			find: 'Copyright \\d{4}',
			replace: 'Copyright 2025',
			desc: 'Update copyright to current year'
		},
		{
			name: 'US Date → ISO Date',
			find: '(\\d{2})/(\\d{2})/(\\d{4})',
			replace: '\\3-\\1-\\2',
			desc: '12/25/2024 → 2024-12-25'
		},
		{
			name: 'Remove Multiple Spaces',
			find: ' {2,}',
			replace: ' ',
			desc: 'Collapse multiple spaces to single'
		},
		{
			name: 'Email Redaction',
			find: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}',
			replace: '[EMAIL]',
			desc: 'Replace emails with [EMAIL]'
		},
		{
			name: 'HTTP → HTTPS',
			find: 'http://',
			replace: 'https://',
			desc: 'Upgrade HTTP links to HTTPS'
		}
	];

	// --- Actions ---

	function handleFileSelect(e) {
		const selected = e.target.files[0];
		if (selected && selected.name.endsWith('.zip')) {
			file = selected;
			errorMessage = '';
			status = 'idle';
		} else {
			errorMessage = 'Please upload a valid .zip file';
		}
	}

	async function processFiles(action = 'preview') {
		if (!file) return;

		status = 'uploading';
		errorMessage = '';

		const formData = new FormData();
		formData.append('file', file);
		formData.append('mode', mode);
		formData.append('action', action);
		formData.append('find', findText);
		formData.append('replace', replaceText);
		formData.append('case_sensitive', isCaseSensitive.toString());

		async function tryFetch(baseUrl) {
			// Note: Cloud Run requires trailing slash due to FastAPI mount behavior
			const url = baseUrl ? `${baseUrl}/api/bulk-replace/` : '/api/bulk-replace';
			return await fetch(url, { method: 'POST', body: formData });
		}

		try {
			// Try Vercel first, fall back to Cloud Run if broken
			let res = await tryFetch(null);

			// Check for Vercel platform error
			const contentType = res.headers.get('content-type') || '';
			if (!contentType.includes('application/json') && !contentType.includes('application/zip')) {
				const text = await res.text();
				if (text.includes('FUNCTION_INVOCATION_FAILED') || (res.status === 500 && text.includes('server error'))) {
					// Vercel Python is broken, try Cloud Run fallback
					status = 'uploading'; // Show "Switching to backup..."
					res = await tryFetch(CLOUD_RUN_BULK_REPLACE_URL);
				} else {
					throw new Error(text || `Server error (${res.status})`);
				}
			}

			if (action === 'download') {
				if (!res.ok) {
					const err = await res.json();
					throw new Error(err.message || 'Download failed');
				}
				const blob = await res.blob();
				const url = window.URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = `tinyutils_${file.name}`;
				a.click();
				window.URL.revokeObjectURL(url);
				status = 'previewing';
			} else {
				const data = await res.json();
				if (!data.ok) throw new Error(data.message || 'Processing failed');

				previewData = data.data;
				status = 'previewing';
				saveToHash();
				// Expose last preview payload for tiny-reactive Tier1
				// harnesses and debugging.
				if (typeof window !== 'undefined') {
					window.__mfsrLastPreview = previewData;
				}
			}
		} catch (e) {
			status = 'error';
			errorMessage = e.message;
		}
	}

	function applyExample(example) {
		findText = example.find;
		replaceText = example.replace;
	}

	function exportCSV() {
		if (!previewData || !previewData.diffs) return;

		const rows = [['Filename', 'Matches Found', 'Status']];

		previewData.diffs.forEach((diff) => {
			rows.push([diff.filename, diff.matchCount, 'modified']);
		});

		const csv = rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
		const blob = new Blob([csv], { type: 'text/csv' });
		const url = window.URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'bulk-replace-changes.csv';
		a.click();
		window.URL.revokeObjectURL(url);
	}

	function saveToHash() {
		if (typeof window === 'undefined') return;
		const state = {
			mode,
			find: findText,
			replace: replaceText,
			case: isCaseSensitive
		};
		try {
			window.location.hash = btoa(JSON.stringify(state));
		} catch {}
	}

	function loadFromHash() {
		if (typeof window === 'undefined') return;
		try {
			const hash = window.location.hash.slice(1);
			if (!hash) return;
			const state = JSON.parse(atob(hash));
			mode = state.mode || 'simple';
			findText = state.find || '';
			replaceText = state.replace || '';
			isCaseSensitive = state.case || false;
		} catch {}
	}

	// --- Helper for Diff Coloring ---
	function parseDiffLine(line) {
		if (line.startsWith('+++') || line.startsWith('---'))
			return { type: 'header', text: line };
		if (line.startsWith('@@')) return { type: 'meta', text: line };
		if (line.startsWith('+')) return { type: 'add', text: line.substring(1) };
		if (line.startsWith('-')) return { type: 'del', text: line.substring(1) };
		return { type: 'same', text: line };
	}

	// Keyboard Shortcuts
	function handleKeydown(e) {
		if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
			e.preventDefault();
			processFiles('preview');
		}
		if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
			e.preventDefault();
			if (previewData) processFiles('download');
		}
		if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
			e.preventDefault();
			if (previewData) exportCSV();
		}
	}

	onMount(() => {
		loadFromHash();
		window.addEventListener('keydown', handleKeydown);
		return () => window.removeEventListener('keydown', handleKeydown);
	});
</script>

<svelte:head>
	<title>Bulk Find & Replace - Multi-File Search and Replace Online | TinyUtils</title>
	<meta
		name="description"
		content="Edit hundreds of files at once. Upload a ZIP, find and replace text across all files with visual diff preview. No installation required."
	/>
	<meta
		name="keywords"
		content="bulk find replace, multi file search replace, batch text editor, regex replace files, find and replace zip"
	/>
	<meta name="robots" content="index, follow" />
	<link rel="canonical" href="/tools/multi-file-search-replace/" />
</svelte:head>

<div class="tool-page" data-testid="mfsr-page">
	<section class="tool-hero">
		<span class="tool-hero-icon" aria-hidden="true">🔄</span>
		<h1>Bulk Find & Replace</h1>
		<p class="tool-hero-subtitle">
			Edit hundreds of files at once. Upload a ZIP, preview the diffs, download.
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

	<!-- Main Card -->
	<section class="card">
		<!-- Step 1: Upload -->
		<div class="step-section">
			<div class="step-header">
				<h2 class="step-title">1. Upload Project (ZIP)</h2>
				{#if file}
					<span class="file-badge">
						{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
					</span>
				{/if}
			</div>

			<label class="dropzone" data-testid="mfsr-upload-zone">
				<input
					type="file"
					accept=".zip"
					class="dropzone-input"
					on:change={handleFileSelect}
				/>
				<div class="dropzone-content">
					{#if file}
						<p class="file-change-text">Click to change file</p>
					{:else}
						<span class="dropzone-icon">📦</span>
						<p class="dropzone-title">Drag & drop your ZIP file here</p>
						<p class="dropzone-hint">Max 50MB • 500 files</p>
					{/if}
				</div>
			</label>
		</div>

		<!-- Step 2: Configure -->
		<div class="step-section config-section">
			<h2 class="step-title">2. Define Rules</h2>

			<div class="mode-switcher">
				<button
					type="button"
					on:click={() => (mode = 'simple')}
					class="mode-tab"
					class:active={mode === 'simple'}
				>
					Simple Text
				</button>
				<button
					type="button"
					on:click={() => (mode = 'regex')}
					class="mode-tab mode-tab-regex"
					class:active={mode === 'regex'}
				>
					⚡ Advanced Regex
				</button>
			</div>

			{#if mode === 'regex'}
				<div class="regex-examples" transition:slide>
					<p class="regex-examples-title">Quick Examples:</p>
					<div class="regex-examples-grid">
						{#each REGEX_EXAMPLES as example}
							<button
								type="button"
								on:click={() => applyExample(example)}
								class="regex-example-btn"
								title={example.desc}
							>
								{example.name}
							</button>
						{/each}
					</div>
				</div>
			{/if}

			<div class="input-grid" in:fade>
				<div class="input-group">
					<label class="input-label" for="find-text">
						Find {mode === 'regex' ? '(Regex Pattern)' : 'Text'}
					</label>
					<input
						id="find-text"
						data-testid="mfsr-find-input"
						bind:value={findText}
						type="text"
						class="glass-input"
						placeholder={mode === 'regex'
							? 'e.g., \\d{4}-\\d{2}'
							: 'e.g., Copyright 2023'}
					/>
					{#if mode === 'regex'}
						<p class="input-hint">Supports Python re syntax (Multiline enabled)</p>
					{/if}
				</div>
				<div class="input-group">
					<label class="input-label" for="replace-text">Replace with</label>
					<input
						id="replace-text"
						data-testid="mfsr-replace-input"
						bind:value={replaceText}
						type="text"
						class="glass-input"
						placeholder={mode === 'regex' ? 'e.g., \\1-\\2' : 'e.g., Copyright 2025'}
					/>
				</div>
			</div>

			<div class="checkbox-row">
				<input
					id="case-sensitive"
					data-testid="mfsr-case-checkbox"
					type="checkbox"
					bind:checked={isCaseSensitive}
					class="glass-checkbox"
				/>
				<label for="case-sensitive" class="checkbox-label">Case Sensitive</label>
			</div>

			<div class="action-row">
				<button
					disabled={!file || status === 'uploading' || !findText}
					on:click={() => processFiles('preview')}
					data-testid="mfsr-preview-button"
					class="btn primary"
				>
					{#if status === 'uploading'}
						<span class="spinner-inline">⚙️</span>
						Scanning...
					{:else}
						Preview Changes
					{/if}
				</button>
			</div>

			{#if errorMessage}
				<div class="error" transition:slide role="status" aria-live="polite">
					⚠️ {errorMessage}
				</div>
			{/if}

			<p class="tip">
				💡 Tip: Press <kbd>Cmd+Enter</kbd> to preview
			</p>
		</div>
	</section>

	<!-- Step 3: Results -->
	{#if status === 'previewing' && previewData}
		<section class="results-section" transition:slide data-testid="mfsr-review-section">
			<div class="results-header">
				<h3 class="results-title">Review Changes</h3>
				<div class="results-actions">
					<button type="button" on:click={exportCSV} class="btn secondary">
						Export CSV
					</button>
					<button type="button" on:click={() => processFiles('download')} class="btn primary">
						Download ZIP ↓
					</button>
				</div>
			</div>

			<!-- Statistics -->
			<div class="stats-grid" data-testid="mfsr-stats-grid">
				<div class="stat-card" data-testid="mfsr-stats-files-scanned">
					<div class="stat-value">{previewData.stats.filesScanned}</div>
					<div class="stat-label">Files Scanned</div>
				</div>
				<div class="stat-card stat-blue" data-testid="mfsr-stats-files-modified">
					<div class="stat-value">{previewData.stats.filesModified}</div>
					<div class="stat-label">Files Modified</div>
				</div>
				<div class="stat-card stat-purple" data-testid="mfsr-stats-total-matches">
					<div class="stat-value">{previewData.stats.totalReplacements}</div>
					<div class="stat-label">Total Matches</div>
				</div>
				<div class="stat-card stat-muted" data-testid="mfsr-stats-files-skipped">
					<div class="stat-value">{previewData.stats.filesSkipped}</div>
					<div class="stat-label">Files Skipped</div>
				</div>
			</div>

			<!-- Diffs -->
			<div class="diffs-container">
				{#if previewData.diffs.length === 0}
					<div class="no-matches">
						<p>No matches found. Check your search text or case sensitivity.</p>
					</div>
				{:else}
					{#each previewData.diffs as diff}
						<div class="diff-card" data-testid="mfsr-diff-item" data-filename={diff.filename}>
							<div class="diff-header">
								<span class="diff-filename">{diff.filename}</span>
								<span class="diff-count">{diff.matchCount} match{diff.matchCount !== 1 ? 'es' : ''}</span>
							</div>
							<div class="diff-body">
								<table class="diff-table">
									<tbody>
										{#each diff.diff.split('\n') as line}
											{@const parsed = parseDiffLine(line)}
											{#if parsed.type !== 'header'}
												<tr class="diff-row diff-row-{parsed.type}">
													<td class="diff-gutter">
														{parsed.type === 'add' ? '+' : parsed.type === 'del' ? '-' : ''}
													</td>
													<td class="diff-content">
														{parsed.text}
													</td>
												</tr>
											{/if}
										{/each}
									</tbody>
								</table>
							</div>
						</div>
					{/each}
				{/if}
			</div>

			<p class="tip">
				💡 Tip: Press <kbd>Cmd+D</kbd> to download • <kbd>Cmd+E</kbd> to export CSV
			</p>
		</section>
	{/if}

	<div class="ad-container">
		<AdSlot slot="2563094163" format="horizontal" />
	</div>
</div>

<style>
	/* ═══════════════════════════════════════════════════════════
	   LIQUID GLASS BULK FIND & REPLACE
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

	/* Step sections */
	.step-section {
		position: relative;
		z-index: 1;
		padding: var(--space-6);
		border-bottom: 1px solid var(--glass-border);
	}

	.step-section:last-child {
		border-bottom: none;
	}

	.config-section {
		background: var(--glass-bg);
	}

	.step-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--space-4);
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	.step-title {
		font-size: 1.1rem;
		font-weight: var(--font-semibold);
		color: var(--text-primary);
	}

	.file-badge {
		font-size: 0.85rem;
		font-weight: var(--font-medium);
		color: #22c55e;
		background: rgba(34, 197, 94, 0.1);
		padding: var(--space-1) var(--space-3);
		border-radius: 9999px;
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
	}

	.dropzone:hover {
		border-color: var(--accent-primary);
		background: var(--glass-bg-hover);
	}

	.dropzone-input {
		display: none;
	}

	.dropzone-icon {
		font-size: 3rem;
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

	.file-change-text {
		font-weight: var(--font-medium);
		color: var(--accent-primary);
	}

	/* Mode switcher */
	.mode-switcher {
		display: flex;
		gap: var(--space-2);
		margin-bottom: var(--space-6);
	}

	.mode-tab {
		padding: var(--space-2) var(--space-4);
		border-radius: var(--radius-lg);
		font-size: 0.9rem;
		font-weight: var(--font-medium);
		color: var(--text-tertiary);
		background: transparent;
		border: 1px solid transparent;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.mode-tab:hover {
		color: var(--text-primary);
	}

	.mode-tab.active {
		background: var(--glass-bg-hover);
		color: var(--accent-primary);
		border-color: var(--glass-border);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.mode-tab-regex.active {
		color: #a855f7;
	}

	:global(html[data-theme="light"]) .mode-tab.active {
		background: rgba(255, 255, 255, 0.9);
	}

	/* Regex examples */
	.regex-examples {
		margin-bottom: var(--space-4);
		padding: var(--space-3);
		background: rgba(168, 85, 247, 0.08);
		border: 1px solid rgba(168, 85, 247, 0.2);
		border-radius: var(--radius-lg);
	}

	.regex-examples-title {
		font-size: 0.9rem;
		font-weight: var(--font-medium);
		color: #a855f7;
		margin-bottom: var(--space-2);
	}

	.regex-examples-grid {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	.regex-example-btn {
		font-size: 0.75rem;
		padding: var(--space-1) var(--space-3);
		background: var(--glass-bg);
		border: 1px solid rgba(168, 85, 247, 0.3);
		border-radius: var(--radius-md);
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.regex-example-btn:hover {
		background: rgba(168, 85, 247, 0.1);
		color: #a855f7;
	}

	/* Input grid */
	.input-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-4);
	}

	@media (min-width: 768px) {
		.input-grid {
			grid-template-columns: 1fr 1fr;
		}
	}

	.input-group {
		display: flex;
		flex-direction: column;
	}

	.input-label {
		font-size: 0.9rem;
		font-weight: var(--font-medium);
		color: var(--text-primary);
		margin-bottom: var(--space-2);
	}

	.glass-input {
		width: 100%;
		padding: var(--space-3);
		font-family: var(--font-mono);
		font-size: 0.9rem;
		background: var(--glass-bg);
		border: 1px solid var(--glass-border);
		border-radius: var(--radius-lg);
		color: var(--text-primary);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		transition: all 0.2s ease;
	}

	.glass-input:focus {
		outline: none;
		border-color: var(--accent-primary);
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.glass-input::placeholder {
		color: var(--text-tertiary);
	}

	.input-hint {
		font-size: 0.75rem;
		color: var(--text-tertiary);
		margin-top: var(--space-1);
	}

	/* Checkbox */
	.checkbox-row {
		display: flex;
		align-items: center;
		margin-top: var(--space-4);
	}

	.glass-checkbox {
		width: 1rem;
		height: 1rem;
		accent-color: var(--accent-primary);
		cursor: pointer;
	}

	.checkbox-label {
		margin-left: var(--space-2);
		font-size: 0.9rem;
		color: var(--text-secondary);
		cursor: pointer;
		user-select: none;
	}

	/* Action row */
	.action-row {
		display: flex;
		justify-content: flex-end;
		margin-top: var(--space-6);
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
	}

	/* Tips */
	.tip {
		margin-top: var(--space-4);
		text-align: center;
		font-size: 0.85rem;
		color: var(--text-tertiary);
	}

	kbd {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		padding: 2px 6px;
		background: var(--glass-bg);
		border: 1px solid var(--glass-border);
		border-radius: var(--radius-sm);
		color: var(--text-secondary);
	}

	/* Spinner */
	.spinner-inline {
		display: inline-block;
		animation: spin 1s linear infinite;
		margin-right: var(--space-2);
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	/* Results section */
	.results-section {
		margin-top: var(--space-8);
	}

	.results-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--space-6);
		flex-wrap: wrap;
		gap: var(--space-3);
	}

	.results-title {
		font-size: 1.5rem;
		font-weight: var(--font-bold);
		color: var(--text-primary);
	}

	.results-actions {
		display: flex;
		gap: var(--space-3);
	}

	/* Stats grid */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-4);
		margin-bottom: var(--space-6);
	}

	@media (min-width: 768px) {
		.stats-grid {
			grid-template-columns: repeat(4, 1fr);
		}
	}

	.stat-card {
		position: relative;
		padding: var(--space-4);
		text-align: center;
		border-radius: var(--radius-xl);
		border: 1px solid var(--glass-border);
		background: var(--glass-bg);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
	}

	.stat-value {
		font-size: 1.75rem;
		font-weight: var(--font-bold);
		color: var(--text-primary);
	}

	.stat-label {
		font-size: 0.85rem;
		color: var(--text-tertiary);
		margin-top: var(--space-1);
	}

	.stat-blue .stat-value {
		color: #3b82f6;
	}

	.stat-purple .stat-value {
		color: #a855f7;
	}

	.stat-muted .stat-value {
		color: var(--text-tertiary);
	}

	/* Diffs container */
	.diffs-container {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.no-matches {
		text-align: center;
		padding: var(--space-10);
		background: var(--glass-bg);
		border-radius: var(--radius-xl);
		border: 2px dashed var(--glass-border);
		color: var(--text-tertiary);
	}

	/* Diff card */
	.diff-card {
		border-radius: var(--radius-xl);
		border: 1px solid var(--glass-border);
		background: var(--glass-bg);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		overflow: hidden;
	}

	.diff-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-3) var(--space-4);
		background: var(--glass-bg);
		border-bottom: 1px solid var(--glass-border);
	}

	.diff-filename {
		font-family: var(--font-mono);
		font-size: 0.85rem;
		font-weight: var(--font-semibold);
		color: var(--text-secondary);
	}

	.diff-count {
		font-size: 0.75rem;
		color: #a855f7;
	}

	.diff-body {
		overflow-x: auto;
	}

	.diff-table {
		width: 100%;
		border-collapse: collapse;
		font-family: var(--font-mono);
		font-size: 0.75rem;
	}

	.diff-row {
		transition: background 0.15s ease;
	}

	.diff-row-add {
		background: rgba(34, 197, 94, 0.1);
	}

	.diff-row-del {
		background: rgba(239, 68, 68, 0.1);
	}

	.diff-gutter {
		width: 2rem;
		text-align: right;
		padding: var(--space-1) var(--space-2);
		color: var(--text-tertiary);
		border-right: 1px solid var(--glass-border);
		user-select: none;
	}

	.diff-content {
		padding: var(--space-1) var(--space-3);
		white-space: pre-wrap;
		word-break: break-all;
		color: var(--text-secondary);
	}

	.diff-row-add .diff-content {
		color: #22c55e;
	}

	.diff-row-del .diff-content {
		color: #ef4444;
		text-decoration: line-through;
		opacity: 0.7;
	}

	.ad-container {
		margin-top: var(--space-8);
	}
</style>
