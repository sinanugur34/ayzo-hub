/*
 * Guest access is intentionally separate from
 * AYZO Free.
 *
 * Guest:
 * - no account required
 * - 1 analysis / rolling 24h
 * - device + IP scoped
 *
 * Signed-in Free:
 * - 3 analyses / rolling 24h
 * - max 2 analyses on one canonical network
 * - user-account scoped across web/mobile
 */
export const GUEST_ANALYSIS_POLICY = {
  limit:
    1,

  period:
    "24h",

  windowSeconds:
    24 * 60 * 60,
} as const;
