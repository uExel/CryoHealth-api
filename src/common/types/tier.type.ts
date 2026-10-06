/** Ordered lowest → highest; the single source for tier validation lists. */
export const TIERS = ['normal', 'watch', 'high', 'critical'] as const;
export type Tier = (typeof TIERS)[number];
