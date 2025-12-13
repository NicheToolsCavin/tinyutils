import type { ImageToolSettings } from './types';

export const SETTINGS_STORAGE_KEY = 'tu_image_compressor_settings_v1';

export const DEFAULT_SETTINGS: ImageToolSettings = {
	outputFormat: 'webp',
	quality: 0.82,
	resize: {
		mode: 'fit',
		maxWidth: 1920,
		maxHeight: 1920
	},
	jpegBackground: '#ffffff',
	highQualityResize: true
};

export function loadSettings(): ImageToolSettings {
	if (typeof localStorage === 'undefined') return DEFAULT_SETTINGS;
	try {
		const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
		if (!raw) return DEFAULT_SETTINGS;
		const parsed = JSON.parse(raw);
		return {
			...DEFAULT_SETTINGS,
			...parsed,
			resize: { ...DEFAULT_SETTINGS.resize, ...(parsed.resize ?? {}) }
		};
	} catch {
		return DEFAULT_SETTINGS;
	}
}

export function saveSettings(settings: ImageToolSettings): void {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
	} catch {
		// ignore quota/private mode issues
	}
}
