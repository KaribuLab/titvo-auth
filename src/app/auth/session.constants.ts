/**
 * Sliding session lifetime in seconds (1 hour), per design D5 — every
 * authenticated request refreshes the session TTL and re-signs the
 * cookie so login stays "short-lived" without a separate refresh-token
 * flow.
 */
export const SESSION_TTL_SECONDS = 3600
