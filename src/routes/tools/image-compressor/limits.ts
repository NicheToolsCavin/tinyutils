export type Plan = 'free' | 'pro';

export interface PlanLimits {
	/** Max number of images that can be queued at once (zip entries count too) */
	maxImages: number;
	/** Max size of a single input file (in bytes) */
	maxFileBytes: number;
	/** Max combined size of all input files (in bytes) */
	maxTotalBytes: number;
	/** Allow HEIC/HEIF input */
	allowHeic: boolean;
	/** Allow ZIP input */
	allowZip: boolean;
}

const mb = (n: number) => n * 1024 * 1024;

export const LIMITS: Record<Plan, PlanLimits> = {
	free: {
		maxImages: 200, // TODO(monetization): lower this to gate bulk processing
		maxFileBytes: 25 * 1024 * 1024, // 25MB (TODO(monetization): lower/raise)
		maxTotalBytes: 750 * 1024 * 1024, // 750MB (TODO(monetization): lower/raise)
		allowHeic: true,
		allowZip: true
	},
	pro: {
		maxImages: Number.POSITIVE_INFINITY,
		maxFileBytes: mb(250),
		maxTotalBytes: Number.POSITIVE_INFINITY,
		allowHeic: true,
		allowZip: true
	}
};

/**
 * Stub plan resolver.
 * TODO(monetization): replace this with your real plan detection (cookie/session/store).
 */
export function getCurrentPlan(): Plan {
	return 'free';
}

export function getLimits(plan: Plan): PlanLimits {
	return LIMITS[plan];
}
