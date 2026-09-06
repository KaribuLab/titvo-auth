import { describe, it, expect, vi, beforeEach } from 'vitest'
import { JwtService } from '@auth/app/auth/jwt.service'
import { SecretService } from '@titvo/shared'

describe('JwtService', () => {
  let jwtService: JwtService
  let mockSecretService: SecretService

  const JWT_SECRET_NAME = 'test-jwt-secret'
  const TEST_SECRET = 'super-secret-signing-key'

  beforeEach(() => {
    mockSecretService = {
      get: vi.fn().mockResolvedValue(TEST_SECRET)
    } as unknown as SecretService

    jwtService = new JwtService(mockSecretService, JWT_SECRET_NAME)
  })

  it('signs a payload and verifies it back to the same claims', async () => {
    const token = await jwtService.sign({ sub: 'user-1', role: 'admin', jti: 'session-1' }, 3600)

    const claims = await jwtService.verify(token)

    expect(claims.sub).toBe('user-1')
    expect(claims.role).toBe('admin')
    expect(claims.jti).toBe('session-1')
  })

  it('signs a different payload and verifies it back to those distinct claims', async () => {
    const token = await jwtService.sign({ sub: 'user-2', role: 'member', jti: 'session-2' }, 3600)

    const claims = await jwtService.verify(token)

    expect(claims.sub).toBe('user-2')
    expect(claims.role).toBe('member')
    expect(claims.jti).toBe('session-2')
  })

  it('rejects an expired token', async () => {
    const token = await jwtService.sign({ sub: 'user-1', role: 'admin', jti: 'session-1' }, -1)

    await expect(jwtService.verify(token)).rejects.toThrow()
  })

  it('rejects a token signed with a different secret', async () => {
    const token = await jwtService.sign({ sub: 'user-1', role: 'admin', jti: 'session-1' }, 3600)

    vi.spyOn(mockSecretService, 'get').mockResolvedValueOnce('a-completely-different-secret')
    const otherJwtService = new JwtService(mockSecretService, JWT_SECRET_NAME)

    await expect(otherJwtService.verify(token)).rejects.toThrow()
  })
})
