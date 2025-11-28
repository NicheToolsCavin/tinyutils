<script>
	import { fade } from 'svelte/transition';
	import Hero from '$lib/components/Hero.svelte';
	import AdSlot from '$lib/components/AdSlot.svelte';

	let file = /** @type {File | null} */ (null);
	let isProcessing = false;
	let errorMessage = '';

	function handleFile(event) {
		const input = event.currentTarget;
		const selected = input.files && input.files[0] ? input.files[0] : null;
		if (selected && selected.name.toLowerCase().endsWith('.zip')) {
			file = selected;
			errorMessage = '';
		} else {
			file = null;
			errorMessage = 'Please upload a ZIP file containing PDFs.';
		}
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
		content="Upload a ZIP of PDFs and download a ZIP of plain text files. Perfect for researchers, legal teams, and AI data preparation."
	/>
	<link rel="canonical" href="/tools/pdf-text-extractor/" />
</svelte:head>

<Hero
	title="Bulk PDF Text Extractor"
	subtitle="Turn a folder of PDFs into searchable plain text files in one click."
/>

<div class="max-w-5xl mx-auto px-4 py-12">
	<div class="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100 p-8">
		<!-- Upload area -->
		<label class="block w-full cursor-pointer group mb-8">
			<div
				class="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center transition-all group-hover:border-red-500 group-hover:bg-red-50"
			>
				<input
					type="file"
					accept=".zip"
					class="hidden"
					on:change={handleFile}
				/>
				<div class="text-gray-500">
					{#if file}
						<div class="text-red-600 font-bold text-lg mb-2">📦 {file.name}</div>
						<div class="text-sm">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
					{:else}
						<span class="text-5xl block mb-4">📑</span>
						<p class="font-medium text-lg text-gray-700">Drag &amp; drop a ZIP containing PDFs</p>
						<p class="text-sm text-gray-400 mt-2">Max 50MB • Up to 50 files</p>
					{/if}
				</div>
			</div>
		</label>

		<button
			class="w-full py-4 bg-gray-900 text-white font-bold rounded-xl shadow-lg hover:bg-black transition-transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
			type="button"
			disabled={!file || isProcessing}
			on:click={process}
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
				Extracting text…
			{:else}
				Download text files (.zip)
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

		<div class="mt-8 text-center text-sm text-gray-400">
			<p>
				This tool extracts text from digital PDFs. Scanned image-only PDFs without a text layer
				will produce little or no output.
			</p>
		</div>
	</div>

	<div class="mt-12">
		<AdSlot slot="2563094163" format="horizontal" />
	</div>
</div>

