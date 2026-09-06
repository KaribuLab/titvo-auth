import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ValidateSessionUseCase } from '@auth/app/auth/validate-session.use-case'
import { SessionExpiredError, SessionInvalidError } from '@auth/app/auth/auth.error'
import { UserRepository } from '@auth/core/user/user.repository'
import { SessionRepository } from '@auth/core/session/session.repository'
import { JwtService } from '@auth/app/auth/jwt.service'
import { UserEntity } from '@auth/core/user/user.entity'
import { SessionEntity } from '@auth/core/session/session.entity'

describe('ValidateSessionUseCase', () => {
  let userRepository: UserRepository
  let sessionRepository: SessionRepository
  let jwtService: JwtService
  let validateSessionUseCase: ValidateSessionUseCase

  const adminUser: UserEntity = {
    userId: 'user-1',
    email: 'admin@titvo.dev',
    passwordHash: 'hashed-password',
    role: 'admin',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  }

  const activeSession: SessionEntity = {
    sessionId: 'session-1',
    userId: 'user-1',
    role: 'admin',
    ttl: Math.floor(Date.now() / 1000) + 3600,
    createdAt: '2026-01-01T00:00:00.000Z'
  }

  beforeEach(() => {
    userRepository = { findByEmail: vi.fn(), findById: vi.fn() } as unknown as UserRepository
    sessionRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      deleteById: vi.fn(),
      refreshTtl: vi.fn()
    } as unknown as SessionRepository
    jwtService = { sign: vi.fn(), verify: vi.fn() } as unknown as JwtService

    validateSessionUseCase = new ValidateSessionUseCase(userRepository, sessionRepository, jwtService)
  })

  it('returns the user for a valid, non-expired session and refreshes its TTL', async () => {
    vi.spyOn(jwtService, 'verify').mockResolvedValue({ sub: 'user-1', role: 'admin', jti: 'session-1' })
    vi.spyOn(sessionRepository, 'findById').mockResolvedValue(activeSession)
    vi.spyOn(userRepository, 'findById').mockResolvedValue(adminUser)

    const result = await validateSessionUseCase.execute('valid.jwt.token')

    expect(result).toEqual({ userId: 'user-1', email: 'admin@titvo.dev', role: 'admin' })
    expect(sessionRepository.refreshTtl).toHaveBeenCalledWith('session-1', expect.any(Number))
  })

  it('rejects a session whose TTL is in the past with SessionExpiredError', async () => {
    const expiredSession: SessionEntity = { ...activeSession, ttl: Math.floor(Date.now() / 1000) - 60 }
    vi.spyOn(jwtService, 'verify').mockResolvedValue({ sub: 'user-1', role: 'admin', jti: 'session-1' })
    vi.spyOn(sessionRepository, 'findById').mockResolvedValue(expiredSession)

    await expect(validateSessionUseCase.execute('expired.jwt.token')).rejects.toThrow(SessionExpiredError)
    expect(sessionRepository.refreshTtl).not.toHaveBeenCalled()
  })

  it('rejects a session that no longer exists (e.g. after logout) with SessionExpiredError', async () => {
    vi.spyOn(jwtService, 'verify').mockResolvedValue({ sub: 'user-1', role: 'admin', jti: 'session-1' })
    vi.spyOn(sessionRepository, 'findById').mockResolvedValue(null)

    await expect(validateSessionUseCase.execute('revoked.jwt.token')).rejects.toThrow(SessionExpiredError)
  })

  it('rejects a token that fails JWT verification with SessionInvalidError', async () => {
    vi.spyOn(jwtService, 'verify').mockRejectedValue(new Error('invalid signature'))

    await expect(validateSessionUseCase.execute('tampered.jwt.token')).rejects.toThrow(SessionInvalidError)
    expect(sessionRepository.findById).not.toHaveBeenCalled()
  })

  it('rejects when the session row does not match the token claims with SessionInvalidError', async () => {
    vi.spyOn(jwtService, 'verify').mockResolvedValue({ sub: 'user-1', role: 'admin', jti: 'session-1' })
    vi.spyOn(sessionRepository, 'findById').mockResolvedValue({ ...activeSession, role: 'member' })

    await expect(validateSessionUseCase.execute('mismatched.jwt.token')).rejects.toThrow(SessionInvalidError)
  })
})
