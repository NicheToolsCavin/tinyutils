<script>
	import { fade } from 'svelte/transition';
	import Hero from '$lib/components/Hero.svelte';
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

<Hero
	title="Smart JSON ↔ CSV Converter"
	subtitle="Flatten nested JSON into spreadsheet-friendly CSV, or convert CSV back into JSON arrays."
/>

<div class="max-w-5xl mx-auto px-4 py-12">
	<div class="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100 p-8">
		<!-- Mode switcher -->
		<div class="flex justify-center mb-8">
			<div class="bg-gray-100 p-1 rounded-lg inline-flex">
				<button
					type="button"
					on:click={() => switchMode('json_to_csv')}
					class={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
						mode === 'json_to_csv' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
					}`}
				>
					JSON to CSV
				</button>
				<button
					type="button"
					on:click={() => switchMode('csv_to_json')}
					class={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
						mode === 'csv_to_json' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
					}`}
				>
					CSV to JSON
				</button>
			</div>
		</div>

		<!-- Upload area -->
		<label class="block w-full cursor-pointer group mb-8">
			<div
				class="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center transition-all group-hover:border-blue-500 group-hover:bg-blue-50"
			>
				<input
					type="file"
					accept={mode === 'json_to_csv' ? '.json,.jsonl,.ndjson' : '.csv,.tsv,.txt'}
					class="hidden"
					data-testid="jsoncsv-upload-input"
					on:change={handleFile}
				/>
				<div class="text-gray-500">
					{#if file}
						<div class="text-green-600 font-bold text-lg mb-2">📄 {file.name}</div>
						<div class="text-xs bg-gray-100 p-2 rounded text-left font-mono text-gray-600 overflow-hidden border border-gray-200 max-h-32">
							{fileSnippet}
						</div>
					{:else}
						<span class="text-4xl block mb-2">{mode === 'json_to_csv' ? '{}' : '▦'}</span>
						<p class="font-medium text-gray-700">
							Upload {mode === 'json_to_csv' ? 'JSON (.json / .jsonl)' : 'CSV / TSV'} file
						</p>
						<p class="text-sm text-gray-400 mt-1">Max 50MB • Nested JSON supported</p>
					{/if}
				</div>
			</div>
		</label>

		<!-- Convert action -->
		<button
			class="w-full py-4 bg-gray-900 text-white font-bold rounded-xl shadow-lg hover:bg-black transition-transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
			type="button"
			data-testid="jsoncsv-convert-button"
			disabled={!file || isProcessing}
			on:click={convert}
		>
			{#if isProcessing}
				<svg
					class="animate-spin h-5 w-5 text-white"
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
				>
					<circle
						class="opacity-25"
						cx="12"
						cy="12"
						r="10"
						stroke="currentColor"
						stroke-width="4"
					/>
					<path
						class="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
					/>
				</svg>
				Converting…
			{:else}
				Download converted file
			{/if}
		</button>

		{#if errorMessage}
			<div
				class="mt-4 p-4 bg-red-50 text-red-600 rounded-lg border border-red-100"
				transition:fade
				role="status"
				aria-live="polite"
			>
				⚠️ {errorMessage}
			</div>
		{/if}
	</div>

	<div class="mt-10 text-xs text-gray-500 space-y-1">
		<p>
			JSON → CSV: nested properties become columns like <code>user.id</code>, <code>meta.country</code>, and arrays are joined with a <code>|</code> separator.
		</p>
		<p>
			CSV → JSON: each row becomes a JSON object using the header row as keys.
		</p>
	</div>

	<div class="mt-12">
		<AdSlot slot="2563094163" format="horizontal" />
	</div>
</div>
