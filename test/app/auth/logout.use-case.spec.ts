import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LogoutUseCase } from '@auth/app/auth/logout.use-case'
import { SessionRepository } from '@auth/core/session/session.repository'
import { JwtService } from '@auth/app/auth/jwt.service'

describe('LogoutUseCase', () => {
  let sessionRepository: SessionRepository
  let jwtService: JwtService
  let logoutUseCase: LogoutUseCase

  beforeEach(() => {
    sessionRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      deleteById: vi.fn(),
      refreshTtl: vi.fn()
    } as unknown as SessionRepository
    jwtService = { sign: vi.fn(), verify: vi.fn() } as unknown as JwtService

    logoutUseCase = new LogoutUseCase(sessionRepository, jwtService)
  })

  it('deletes the session row identified by the token jti claim', async () => {
    vi.spyOn(jwtService, 'verify').mockResolvedValue({ sub: 'user-1', role: 'admin', jti: 'session-1' })

    await logoutUseCase.execute('valid.jwt.token')

    expect(sessionRepository.deleteById).toHaveBeenCalledWith('session-1')
  })

  it('deletes a different session row for a different token jti claim', async () => {
    vi.spyOn(jwtService, 'verify').mockResolvedValue({ sub: 'user-2', role: 'member', jti: 'session-2' })

    await logoutUseCase.execute('another.jwt.token')

    expect(sessionRepository.deleteById).toHaveBeenCalledWith('session-2')
  })

  it('is a no-op (does not throw, deletes nothing) for an already-invalid token', async () => {
    vi.spyOn(jwtService, 'verify').mockRejectedValue(new Error('invalid signature'))

    await expect(logoutUseCase.execute('tampered.jwt.token')).resolves.toBeUndefined()
    expect(sessionRepository.deleteById).not.toHaveBeenCalled()
  })
})
