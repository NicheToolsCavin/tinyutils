import type { ImageToolSettings } from './types';

export interface WorkerCapabilities {
	offscreenCanvas: boolean;
	encode: {
		jpeg: boolean;
		png: boolean;
		webp: boolean;
	};
}

export interface WorkerProcessRequest {
	type: 'process';
	messageId: string;
	name: string;
	inputType: string;
	buffer: ArrayBuffer;
	settings: ImageToolSettings;
	outputMime: string;
}

export interface WorkerPingRequest {
	type: 'ping';
	messageId: string;
}

export type WorkerRequest = WorkerProcessRequest | WorkerPingRequest;

export interface WorkerPongResponse {
	type: 'pong';
	messageId: string;
	ok: true;
	capabilities: WorkerCapabilities;
}

export interface WorkerResultResponseOk {
	type: 'result';
	messageId: string;
	ok: true;
	outputBuffer: ArrayBuffer;
	outputType: string;
	inputWidth: number;
	inputHeight: number;
	outputWidth: number;
	outputHeight: number;
}

export interface WorkerResultResponseErr {
	type: 'result';
	messageId: string;
	ok: false;
	error: string;
}

export type WorkerResponse = WorkerPongResponse | WorkerResultResponseOk | WorkerResultResponseErr;

type Pending = {
	resolve: (value: WorkerResponse) => void;
	reject: (err: any) => void;
};

export class ImageWorkerPool {
	private workers: Worker[] = [];
	private pending = new Map<string, Pending>();
	public capabilities: WorkerCapabilities | null = null;

	constructor(
		private workerUrl: URL,
		private size: number
	) {}

	async init(): Promise<WorkerCapabilities | null> {
		this.terminate();

		try {
			for (let i = 0; i < this.size; i++) {
				const w = new Worker(this.workerUrl, { type: 'module' });
				w.onmessage = (evt: MessageEvent<WorkerResponse>) => this.onMessage(evt.data);
				w.onerror = (err) => {
					// Reject all pending
					for (const [, p] of this.pending) p.reject(err);
					this.pending.clear();
				};
				this.workers.push(w);
			}

			const caps = await this.ping(this.workers[0]);
			this.capabilities = caps;
			return caps;
		} catch {
			this.terminate();
			return null;
		}
	}

	getSize(): number {
		return this.size;
	}

	private onMessage(msg: WorkerResponse) {
		const p = this.pending.get(msg.messageId);
		if (!p) return;
		this.pending.delete(msg.messageId);
		p.resolve(msg);
	}

	private async ping(worker: Worker): Promise<WorkerCapabilities | null> {
		const messageId = crypto.randomUUID();
		const req: WorkerPingRequest = { type: 'ping', messageId };

		const res = await this.post(worker, req);
		if (res.type === 'pong' && res.ok) return res.capabilities;
		return null;
	}

	private post(worker: Worker, req: WorkerRequest, transfer: Transferable[] = []): Promise<WorkerResponse> {
		return new Promise((resolve, reject) => {
			this.pending.set(req.messageId, { resolve, reject });
			worker.postMessage(req, transfer);
		});
	}

	/**
	 * Round-robin select a worker.
	 */
	private pickWorker(messageId: string): Worker {
		// Deterministic selection keeps messages roughly balanced.
		const idx = Math.abs(hashString(messageId)) % this.workers.length;
		return this.workers[idx];
	}

	async process(
		input: { name: string; inputType: string; buffer: ArrayBuffer },
		settings: ImageToolSettings,
		outputMime: string
	): Promise<WorkerResultResponseOk> {
		if (!this.workers.length) throw new Error('Worker pool is not initialized.');

		const messageId = crypto.randomUUID();
		const req: WorkerProcessRequest = {
			type: 'process',
			messageId,
			name: input.name,
			inputType: input.inputType,
			buffer: input.buffer,
			settings,
			outputMime
		};

		const w = this.pickWorker(messageId);
		const res = await this.post(w, req, [input.buffer]);
		if (res.type !== 'result') throw new Error('Unexpected worker response.');
		if (res.ok === false) throw new Error(res.error);
		return res;
	}

	terminate(): void {
		for (const w of this.workers) w.terminate();
		this.workers = [];
		this.capabilities = null;
		for (const [, p] of this.pending) p.reject(new Error('Worker terminated'));
		this.pending.clear();
	}
}

function hashString(s: string): number {
	let h = 0;
	for (let i = 0; i < s.length; i++) {
		h = (h << 5) - h + s.charCodeAt(i);
		h |= 0;
	}
	return h;
}
