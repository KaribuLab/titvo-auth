import { describe, it, expect } from 'vitest'
import { createHash } from 'crypto'
import { generateApiKey, hashApiKey } from '@auth/app/api-key/generate-api-key'

// Format/hash must be byte-compatible with titvo-installer's Go
// generateAPIKey()/hashSha256 (internal/start.go:16-54): prefix "tvok-" +
// 43 chars from [A-Za-z0-9] (48 total), hashed as lowercase-hex SHA-256 of
// the raw UTF-8 key. Both sides must agree or console-minted keys won't
// authenticate against the installer-minted-key validation path.
describe('generateApiKey', () => {
  it('produces a key matching the installer format: "tvok-" + 43 alphanumeric chars, 48 total', () => {
    const { apiKey } = generateApiKey()

    expect(apiKey).toMatch(/^tvok-[A-Za-z0-9]{43}$/)
    expect(apiKey).toHaveLength(48)
  })

  it('produces different keys on successive calls (real randomness, not a fixed fake)', () => {
    const first = generateApiKey()
    const second = generateApiKey()

    expect(first.apiKey).not.toBe(second.apiKey)
  })

  it('pairs the raw key with its SHA-256 hex hash, matching an independently computed hash', () => {
    const { apiKey, hashedApiKey } = generateApiKey()

    const independentHash = createHash('sha256').update(apiKey).digest('hex')

    expect(hashedApiKey).toBe(independentHash)
    expect(hashedApiKey).toMatch(/^[a-f0-9]{64}$/)
  })
})

describe('hashApiKey', () => {
  it('hashes a known input to its known SHA-256 hex digest (round-trip against a fixed vector)', () => {
    const knownRawKey = 'tvok-0000000000000000000000000000000000000000000'
    const expectedHash = createHash('sha256').update(knownRawKey).digest('hex')

    expect(hashApiKey(knownRawKey)).toBe(expectedHash)
  })

  it('is deterministic: hashing the same input twice yields the same digest', () => {
    const rawKey = 'tvok-abcDEF1234567890abcDEF1234567890abcDEF123'

    expect(hashApiKey(rawKey)).toBe(hashApiKey(rawKey))
  })
})
