<script>
	import { fade, slide } from 'svelte/transition';
	import Hero from '$lib/components/Hero.svelte';
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

<Hero
	title="Big CSV Joiner"
	subtitle="Merge two CSV files like a database JOIN – without crashing Excel."
/>

<div class="max-w-5xl mx-auto px-4 py-12">
	<div class="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100 p-8">
		<!-- Step 1: Upload -->
		{#if step === 1}
			<div in:fade>
				<h2
					class="text-lg font-semibold text-gray-800 mb-4"
					data-testid="csv-joiner-step-heading"
				>
					1. Upload two files to join
				</h2>
				<div
					class="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center hover:bg-gray-50 transition-colors relative"
				>
					<input
						type="file"
						accept=".csv,.tsv,.txt"
						multiple
						class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
						data-testid="csv-joiner-upload-input"
						on:change={(e) => {
							files = Array.from(e.currentTarget.files ?? []).slice(0, 2);
							if (files.length === 2) handleScan();
						}}
					/>
					<div class="text-gray-500">
						<span class="text-4xl block mb-2">📄 + 📄</span>
						<p class="font-medium">Drag &amp; drop 2 CSV/TSV files here</p>
						<p class="text-sm text-gray-400 mt-1">Max 50MB per file • Auto delimiter detection</p>
					</div>
				</div>
			</div>
		{/if}

		<!-- Step 2: Configure join once headers are known -->
		{#if step === 2 && fileData.length === 2}
			<div in:slide>
				<div class="flex justify-between items-center mb-6">
					<h2 class="text-lg font-semibold text-gray-800">2. Configure join</h2>
					<button
						type="button"
						class="text-sm text-gray-400 hover:text-red-500"
						on:click={reset}
					>
						Reset
					</button>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
					<!-- File A -->
					<div class="bg-blue-50 p-4 rounded-lg border border-blue-100">
						<div class="font-bold text-blue-800 mb-2 truncate">{files[0]?.name}</div>
						<p class="text-xs text-blue-500 mb-2">Detected delimiter: {fileData[0].delimiter || ','}</p>
						<label class="block text-xs uppercase font-bold text-blue-500 mb-1" for="matchColumnA">
							Match column
						</label>
						<select
							id="matchColumnA"
							bind:value={joinKeyA}
							class="w-full p-2 rounded border-blue-200 bg-white text-sm"
						>
							{#each fileData[0].headers || [] as h, i}
								<option value={i}>{h}</option>
							{/each}
						</select>
					</div>

					<!-- File B -->
					<div class="bg-purple-50 p-4 rounded-lg border border-purple-100">
						<div class="font-bold text-purple-800 mb-2 truncate">{files[1]?.name}</div>
						<p class="text-xs text-purple-500 mb-2">Detected delimiter: {fileData[1].delimiter || ','}</p>
						<label class="block text-xs uppercase font-bold text-purple-500 mb-1" for="matchColumnB">
							Match column
						</label>
						<select
							id="matchColumnB"
							bind:value={joinKeyB}
							class="w-full p-2 rounded border-purple-200 bg-white text-sm"
						>
							{#each fileData[1].headers || [] as h, i}
								<option value={i}>{h}</option>
							{/each}
						</select>
					</div>
				</div>

				<!-- Join type selector -->
				<fieldset class="mb-8">
					<legend class="block text-sm font-medium text-gray-700 mb-2">Join type</legend>
					<div class="flex flex-col md:flex-row gap-4">
						<label
							class={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
								joinType === 'inner'
									? 'ring-2 ring-blue-500 bg-blue-50'
									: 'hover:bg-gray-50'
							}`}
						>
							<input
								type="radio"
								bind:group={joinType}
								value="inner"
								class="text-blue-600"
							/>
							<div>
								<div class="font-bold text-sm">Inner join</div>
								<div class="text-xs text-gray-500">Only rows that match in both files.</div>
							</div>
						</label>

						<label
							class={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
								joinType === 'left'
									? 'ring-2 ring-blue-500 bg-blue-50'
									: 'hover:bg-gray-50'
							}`}
						>
							<input
								type="radio"
								bind:group={joinType}
								value="left"
								class="text-blue-600"
							/>
							<div>
								<div class="font-bold text-sm">Left join (VLOOKUP)</div>
								<div class="text-xs text-gray-500">All rows from file 1, matches from file 2.</div>
							</div>
						</label>
					</div>
				</fieldset>

				<button
					type="button"
					on:click={handleJoin}
					class="w-full py-4 bg-gray-900 text-white font-bold rounded-xl shadow-lg hover:bg-black transition-transform active:scale-[0.98]"
				>
					Merge files
				</button>
			</div>
		{/if}

		<!-- Step 3: Processing indicator -->
		{#if step === 3}
			<div class="text-center py-12" in:fade>
				<div class="animate-spin text-4xl mb-4">⚙️</div>
				<h3 class="text-xl font-bold text-gray-800 mb-2">Merging data…</h3>
				<p class="text-gray-500 text-sm">Large files may take a few seconds. We keep everything in-memory and do not store uploads.</p>
			</div>
		{/if}

		{#if errorMsg}
			<div
				class="mt-4 p-4 bg-red-50 text-red-700 rounded-lg border border-red-100"
				role="status"
				aria-live="polite"
			>
				⚠️ {errorMsg}
			</div>
		{/if}
	</div>

	<div class="mt-10 text-xs text-gray-500 text-center">
		<p>
			Tip: Use a unique ID column (like <code>email</code> or <code>customer_id</code>) in both files for best results.
		</p>
	</div>

	<div class="mt-12">
		<AdSlot slot="2563094163" format="horizontal" />
	</div>
</div>
