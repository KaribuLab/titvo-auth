import { randomBytes, createHash } from 'crypto'

/**
 * Prefix and total length must stay byte-compatible with titvo-installer's
 * Go `generateAPIKey()` (internal/start.go:16-54): "tvok-" + 43 chars from
 * [A-Za-z0-9] (48 total). Console-minted and installer-minted keys must
 * authenticate through the same `ValidateApiKeyUseCase` lookup.
 */
const API_KEY_PREFIX = 'tvok-'
const API_KEY_SUFFIX_LENGTH = 43
const API_KEY_CHARSET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

export interface GeneratedApiKey {
  /**
   * The raw, plaintext API key. Callers must return this to the admin
   * exactly once and never persist it in raw form.
   */
  apiKey: string
  /**
   * Lowercase-hex SHA-256 digest of `apiKey`. This is the only form that
   * may be persisted to the repository.
   */
  hashedApiKey: string
}

/**
 * Hashes a raw API key with SHA-256, matching titvo-installer's
 * `hashSha256()` and `ValidateApiKeyUseCase`'s inline hashing exactly.
 */
export function hashApiKey (apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex')
}

/**
 * Generates a new admin-console API key in the installer's exact format
 * and returns both the raw key (show once) and its SHA-256 hash
 * (persist only this).
 */
export function generateApiKey (): GeneratedApiKey {
  const bytes = randomBytes(API_KEY_SUFFIX_LENGTH)

  let suffix = ''
  for (const byte of bytes) {
    suffix += API_KEY_CHARSET[byte % API_KEY_CHARSET.length]
  }

  const apiKey = `${API_KEY_PREFIX}${suffix}`

  return { apiKey, hashedApiKey: hashApiKey(apiKey) }
}
