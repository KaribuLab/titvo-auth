/**
 * Lifecycle status of an API Key. `revoked` blocks validation.
 *
 * Backward compatibility: the `status` attribute is ABSENT on every
 * installer-minted key persisted before this field existed. Absence MUST
 * be treated as `active` — never require `status === 'active'`, always
 * check `status !== 'revoked'`. Treating missing as revoked would
 * instantly break every CI pipeline authenticating with a legacy key.
 */
export type ApiKeyStatus = 'active' | 'revoked'

/**
 * DTO representing an API Key in the system
 */
export interface ApiKeyEntity {
  /**
   * Unique identifier of the API Key
   */
  keyId: string

  /**
   * ID of the user who owns the API Key
   */
  userId: string

  /**
   * Value of the API Key (persisted as its SHA-256 hash only — never
   * the raw key)
   */
  apiKey: string

  /**
   * Human-readable label assigned at creation. Optional/backward-tolerant:
   * absent on keys minted before this field existed.
   */
  label?: string

  /**
   * Lifecycle status. Optional/backward-tolerant — absence means active,
   * see `ApiKeyStatus`.
   */
  status?: ApiKeyStatus

  /**
   * ISO-8601 timestamp of when the key was created. Optional/
   * backward-tolerant.
   */
  createdAt?: string

  /**
   * ID of the admin user who created the key. Optional/backward-tolerant.
   */
  createdBy?: string

  /**
   * ISO-8601 timestamp of when the key was revoked, if ever.
   */
  revokedAt?: string

  /**
   * ISO-8601 timestamp of the key's last successful validation. Deferred
   * (per design open questions): always undefined for now — tracking it
   * would add a write to the hot CI validation path.
   */
  lastUsedAt?: string
}
