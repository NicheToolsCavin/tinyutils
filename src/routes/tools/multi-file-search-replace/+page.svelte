<script>
	import { fade, slide } from 'svelte/transition';
	import { onMount } from 'svelte';
	import Hero from '$lib/components/Hero.svelte';
	import AdSlot from '$lib/components/AdSlot.svelte';

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

		try {
			const res = await fetch('/api/bulk-replace', { method: 'POST', body: formData });

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
</svelte:head>

<Hero
	title="Bulk Find & Replace"
	subtitle="Edit hundreds of files at once. Upload a ZIP, preview the diffs, download."
/>

<div class="max-w-5xl mx-auto px-4 py-12">
	<!-- Main Card -->
	<div class="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
		<!-- Step 1: Upload -->
		<div class="p-8 border-b border-gray-100">
			<div class="flex items-center justify-between mb-4">
				<h2 class="text-lg font-semibold text-gray-700">1. Upload Project (ZIP)</h2>
				{#if file}
					<span
						class="text-green-600 text-sm font-medium bg-green-50 px-3 py-1 rounded-full"
					>
						{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
					</span>
				{/if}
			</div>

			<label class="block w-full cursor-pointer group">
				<div
					class="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center transition-all group-hover:border-blue-500 group-hover:bg-blue-50"
				>
					<input
						type="file"
						accept=".zip"
						class="hidden"
						on:change={handleFileSelect}
					/>
					<div class="text-gray-500">
						{#if file}
							<p class="text-blue-600 font-medium">Click to change file</p>
						{:else}
							<span class="text-4xl block mb-2">📦</span>
							<p class="font-medium text-gray-700">
								Drag & drop your ZIP file here
							</p>
							<p class="text-sm text-gray-400 mt-1">Max 50MB • 500 files</p>
						{/if}
					</div>
				</div>
			</label>
		</div>

		<!-- Step 2: Configure -->
		<div class="p-8 bg-gray-50/50">
			<h2 class="text-lg font-semibold text-gray-700 mb-4">2. Define Rules</h2>

			<div class="flex gap-2 mb-6">
				<button
					on:click={() => (mode = 'simple')}
					class="px-5 py-2 rounded-lg font-medium text-sm transition-colors {mode ===
					'simple'
						? 'bg-white shadow text-blue-600 ring-1 ring-blue-100'
						: 'text-gray-500 hover:text-gray-700'}"
				>
					Simple Text
				</button>
				<button
					on:click={() => (mode = 'regex')}
					class="px-5 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 {mode ===
					'regex'
						? 'bg-white shadow text-purple-600 ring-1 ring-purple-100'
						: 'text-gray-500 hover:text-gray-700'}"
				>
					<span>⚡ Advanced Regex</span>
				</button>
			</div>

			{#if mode === 'regex'}
				<div
					class="mb-4 bg-purple-50 border border-purple-100 rounded-lg p-3"
					transition:slide
				>
					<p class="text-sm text-purple-800 font-medium mb-2">Quick Examples:</p>
					<div class="flex flex-wrap gap-2">
						{#each REGEX_EXAMPLES as example}
							<button
								on:click={() => applyExample(example)}
								class="text-xs bg-white px-3 py-1 rounded border border-purple-200 hover:bg-purple-100 transition"
								title={example.desc}
							>
								{example.name}
							</button>
						{/each}
					</div>
				</div>
			{/if}

			<div class="grid grid-cols-1 md:grid-cols-2 gap-6" in:fade>
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2"
						>Find {mode === 'regex' ? '(Regex Pattern)' : 'Text'}</label
					>
					<input
						bind:value={findText}
						type="text"
						class="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 p-3 border font-mono text-sm"
						placeholder={mode === 'regex'
							? 'e.g., \\d{4}-\\d{2}'
							: 'e.g., Copyright 2023'}
					/>
					{#if mode === 'regex'}
						<p class="text-xs text-gray-500 mt-1">
							Supports Python re syntax (Multiline enabled)
						</p>
					{/if}
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2"
						>Replace with</label
					>
					<input
						bind:value={replaceText}
						type="text"
						class="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 p-3 border font-mono text-sm"
						placeholder={mode === 'regex' ? 'e.g., \\1-\\2' : 'e.g., Copyright 2025'}
					/>
				</div>
			</div>

			<div class="mt-4 flex items-center">
				<input
					id="case-sensitive"
					type="checkbox"
					bind:checked={isCaseSensitive}
					class="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
				/>
				<label for="case-sensitive" class="ml-2 text-sm text-gray-600 select-none"
					>Case Sensitive</label
				>
			</div>

			<div class="mt-8 flex justify-end gap-4">
				<button
					disabled={!file || status === 'uploading' || !findText}
					on:click={() => processFiles('preview')}
					class="px-6 py-3 bg-gray-800 hover:bg-gray-900 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
				>
					{#if status === 'uploading'}
						<svg
							class="animate-spin h-5 w-5 text-white"
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							><circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
							></circle><path
								class="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							></path></svg
						>
						Scanning...
					{:else}
						Preview Changes
					{/if}
				</button>
			</div>

			{#if errorMessage}
				<div
					class="mt-4 p-4 bg-red-50 text-red-700 rounded-lg border border-red-100 flex items-start gap-3"
					transition:slide
				>
					<span class="text-xl">⚠️</span>
					<p>{errorMessage}</p>
				</div>
			{/if}

			<p class="text-xs text-gray-500 mt-4 text-center">
				💡 Tip: Press <kbd class="px-2 py-1 bg-gray-200 rounded text-xs">Cmd+Enter</kbd
				> to preview
			</p>
		</div>
	</div>

	<!-- Step 3: Results -->
	{#if status === 'previewing' && previewData}
		<div class="mt-12" transition:slide>
			<div class="flex items-center justify-between mb-6">
				<h3 class="text-2xl font-bold text-gray-800">Review Changes</h3>
				<div class="flex gap-3">
					<button
						on:click={exportCSV}
						class="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg shadow transition-colors flex items-center gap-2"
					>
						Export CSV
					</button>
					<button
						on:click={() => processFiles('download')}
						class="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow transition-colors flex items-center gap-2"
					>
						Download ZIP
						<svg
							class="w-5 h-5"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							><path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
							></path></svg
						>
					</button>
				</div>
			</div>

			<!-- Statistics -->
			<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
				<div class="bg-white p-4 rounded-lg shadow-sm border border-gray-100 text-center">
					<div class="text-3xl font-bold text-gray-800">
						{previewData.stats.filesScanned}
					</div>
					<div class="text-gray-500 text-sm">Files Scanned</div>
				</div>
				<div class="bg-white p-4 rounded-lg shadow-sm border border-gray-100 text-center">
					<div class="text-3xl font-bold text-blue-600">
						{previewData.stats.filesModified}
					</div>
					<div class="text-gray-500 text-sm">Files Modified</div>
				</div>
				<div class="bg-white p-4 rounded-lg shadow-sm border border-gray-100 text-center">
					<div class="text-3xl font-bold text-purple-600">
						{previewData.stats.totalReplacements}
					</div>
					<div class="text-gray-500 text-sm">Total Matches</div>
				</div>
				<div class="bg-white p-4 rounded-lg shadow-sm border border-gray-100 text-center">
					<div class="text-3xl font-bold text-gray-400">
						{previewData.stats.filesSkipped}
					</div>
					<div class="text-gray-500 text-sm">Files Skipped</div>
				</div>
			</div>

			<!-- Diffs -->
			<div class="space-y-6">
				{#if previewData.diffs.length === 0}
					<div
						class="text-center p-12 bg-gray-50 rounded-lg border border-dashed border-gray-300"
					>
						<p class="text-gray-500">
							No matches found. Check your search text or case sensitivity.
						</p>
					</div>
				{:else}
					{#each previewData.diffs as diff}
						<div
							class="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm"
						>
							<div
								class="bg-gray-50 px-4 py-2 border-b border-gray-200 text-sm font-mono text-gray-600 font-semibold flex justify-between items-center"
							>
								<span>{diff.filename}</span>
								<span class="text-xs text-purple-600"
									>{diff.matchCount} match{diff.matchCount !== 1 ? 'es' : ''}</span
								>
							</div>
							<div class="overflow-x-auto">
								<table class="w-full text-left border-collapse">
									<tbody class="font-mono text-xs">
										{#each diff.diff.split('\n') as line}
											{@const parsed = parseDiffLine(line)}
											{#if parsed.type !== 'header'}
												<tr
													class="{parsed.type === 'add'
														? 'bg-green-50'
														: parsed.type === 'del'
															? 'bg-red-50'
															: ''}"
												>
													<td
														class="w-8 select-none text-right px-2 py-1 text-gray-400 border-r border-gray-100"
													>
														{parsed.type === 'add'
															? '+'
															: parsed.type === 'del'
																? '-'
																: ''}
													</td>
													<td
														class="px-4 py-1 whitespace-pre-wrap break-all {parsed.type ===
														'add'
															? 'text-green-800'
															: parsed.type === 'del'
																? 'text-red-800 line-through opacity-60'
																: 'text-gray-600'}"
													>
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

			<p class="text-xs text-gray-500 mt-6 text-center">
				💡 Tip: Press <kbd class="px-2 py-1 bg-gray-200 rounded text-xs">Cmd+D</kbd> to
				download • <kbd class="px-2 py-1 bg-gray-200 rounded text-xs">Cmd+E</kbd> to export
				CSV
			</p>
		</div>
	{/if}

	<!-- Ad Slot -->
	<div class="mt-12">
		<AdSlot slot="2563094163" format="horizontal" />
	</div>
</div>

<style>
	kbd {
		font-family: monospace;
	}
</style>
