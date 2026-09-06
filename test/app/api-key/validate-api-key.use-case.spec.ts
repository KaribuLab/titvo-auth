import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createHash } from 'crypto'
import { ValidateApiKeyUseCase } from '@auth/app/api-key/api-key.service'
import { ApiKeyRepository } from '@auth/core/api-key/api-key.repository'
import { ApiKeyEntity } from '@auth/core/api-key/api-key.entity'
import { AesService } from '@titvo/shared'

// Characterization/approval tests locking in the existing X-API-Key
// machine-auth behavior (no tests existed for this file before Phase 1).
// Purpose: prove this path is byte-for-byte unaffected by the new
// login/session admin-auth code added alongside it in this same batch —
// this is the CI pipelines' auth path and must not regress.
describe('ValidateApiKeyUseCase (existing X-API-Key path — route isolation)', () => {
  let apiKeyRepository: ApiKeyRepository
  let aesService: AesService
  let useCase: ValidateApiKeyUseCase

  const rawKey = 'my-plain-api-key'
  const hashedKey = createHash('sha256').update(rawKey).digest('hex')
  const record: ApiKeyEntity = { keyId: 'key-1', userId: 'user-1', apiKey: hashedKey }

  beforeEach(() => {
    apiKeyRepository = {
      findByUserId: vi.fn(),
      findByApiKey: vi.fn()
    } as unknown as ApiKeyRepository

    aesService = {
      encrypt: vi.fn(),
      decrypt: vi.fn()
    } as unknown as AesService

    useCase = new ValidateApiKeyUseCase(apiKeyRepository, aesService)
  })

  it('returns the api key record for a raw key that hashes to a known record', async () => {
    vi.spyOn(apiKeyRepository, 'findByApiKey').mockResolvedValue(record)

    const result = await useCase.execute(rawKey)

    expect(result).toEqual(record)
    expect(apiKeyRepository.findByApiKey).toHaveBeenCalledWith(hashedKey)
  })

  it('returns the api key record for an already-hashed (sha256) key without re-hashing', async () => {
    vi.spyOn(apiKeyRepository, 'findByApiKey').mockResolvedValue(record)

    const result = await useCase.execute(hashedKey)

    expect(result).toEqual(record)
    expect(apiKeyRepository.findByApiKey).toHaveBeenCalledWith(hashedKey)
  })

  it('decrypts an ENC:-prefixed key via AesService before hashing/lookup', async () => {
    vi.spyOn(aesService, 'decrypt').mockResolvedValue(rawKey)
    vi.spyOn(apiKeyRepository, 'findByApiKey').mockResolvedValue(record)

    const result = await useCase.execute(`ENC:${rawKey}`)

    expect(aesService.decrypt).toHaveBeenCalledWith(rawKey)
    expect(apiKeyRepository.findByApiKey).toHaveBeenCalledWith(hashedKey)
    expect(result).toEqual(record)
  })

  it('throws NoAuthorizedApiKeyError when no record is found', async () => {
    vi.spyOn(apiKeyRepository, 'findByApiKey').mockResolvedValue(null)

    await expect(useCase.execute(rawKey)).rejects.toThrow('API key is not authorized')
  })

  it('throws ApiKeyNotFoundError when no key is provided', async () => {
    await expect(useCase.execute(undefined)).rejects.toThrow('API key not found')
  })
})

// Soft-revoke (design D5). Backward-compat rule: a MISSING `status`
// attribute means active — every installer-minted key in prod predates
// this field. Only an explicit `status === 'revoked'` must reject.
describe('ValidateApiKeyUseCase (revoked-status check)', () => {
  let apiKeyRepository: ApiKeyRepository
  let aesService: AesService
  let useCase: ValidateApiKeyUseCase

  const rawKey = 'my-plain-api-key'
  const hashedKey = createHash('sha256').update(rawKey).digest('hex')

  beforeEach(() => {
    apiKeyRepository = {
      findByUserId: vi.fn(),
      findByApiKey: vi.fn(),
      findAll: vi.fn(),
      create: vi.fn(),
      revoke: vi.fn()
    } as unknown as ApiKeyRepository

    aesService = {
      encrypt: vi.fn(),
      decrypt: vi.fn()
    } as unknown as AesService

    useCase = new ValidateApiKeyUseCase(apiKeyRepository, aesService)
  })

  it('rejects a key whose status is explicitly "revoked"', async () => {
    const revokedRecord: ApiKeyEntity = {
      keyId: 'key-1',
      userId: 'user-1',
      apiKey: hashedKey,
      status: 'revoked',
      revokedAt: '2026-01-01T00:00:00.000Z'
    }
    vi.spyOn(apiKeyRepository, 'findByApiKey').mockResolvedValue(revokedRecord)

    await expect(useCase.execute(rawKey)).rejects.toThrow('API key is not authorized')
  })

  it('still validates a legacy key with NO status attribute at all (pre-field installer key)', async () => {
    const legacyRecord: ApiKeyEntity = { keyId: 'key-2', userId: 'user-2', apiKey: hashedKey }
    vi.spyOn(apiKeyRepository, 'findByApiKey').mockResolvedValue(legacyRecord)

    const result = await useCase.execute(rawKey)

    expect(result).toEqual(legacyRecord)
  })

  it('validates a key whose status is explicitly "active"', async () => {
    const activeRecord: ApiKeyEntity = { keyId: 'key-3', userId: 'user-3', apiKey: hashedKey, status: 'active' }
    vi.spyOn(apiKeyRepository, 'findByApiKey').mockResolvedValue(activeRecord)

    const result = await useCase.execute(rawKey)

    expect(result).toEqual(activeRecord)
  })
})
