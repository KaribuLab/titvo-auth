import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LoginUseCase } from '@auth/app/auth/login.use-case'
import { InvalidCredentialsError } from '@auth/app/auth/auth.error'
import { UserRepository } from '@auth/core/user/user.repository'
import { SessionRepository } from '@auth/core/session/session.repository'
import { PasswordHasherService } from '@auth/app/auth/password-hasher.service'
import { JwtService } from '@auth/app/auth/jwt.service'
import { UserEntity } from '@auth/core/user/user.entity'

describe('LoginUseCase', () => {
  let userRepository: UserRepository
  let sessionRepository: SessionRepository
  let passwordHasherService: PasswordHasherService
  let jwtService: JwtService
  let loginUseCase: LoginUseCase

  const adminUser: UserEntity = {
    userId: 'user-1',
    email: 'admin@titvo.dev',
    passwordHash: 'hashed-password',
    role: 'admin',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  }

  beforeEach(() => {
    userRepository = {
      findByEmail: vi.fn(),
      findById: vi.fn()
    } as unknown as UserRepository

    sessionRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      deleteById: vi.fn(),
      refreshTtl: vi.fn()
    } as unknown as SessionRepository

    passwordHasherService = {
      hash: vi.fn(),
      verify: vi.fn()
    } as unknown as PasswordHasherService

    jwtService = {
      sign: vi.fn().mockResolvedValue('signed.jwt.token'),
      verify: vi.fn()
    } as unknown as JwtService

    loginUseCase = new LoginUseCase(userRepository, sessionRepository, passwordHasherService, jwtService)
  })

  it('issues a session and JWT encoding the role for valid admin credentials', async () => {
    vi.spyOn(userRepository, 'findByEmail').mockResolvedValue(adminUser)
    vi.spyOn(passwordHasherService, 'verify').mockResolvedValue(true)

    const result = await loginUseCase.execute('admin@titvo.dev', 'correct-password')

    expect(result.token).toBe('signed.jwt.token')
    expect(result.user).toEqual({ userId: 'user-1', email: 'admin@titvo.dev', role: 'admin' })
    expect(sessionRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', role: 'admin' })
    )
    expect(jwtService.sign).toHaveBeenCalledWith(
      expect.objectContaining({ sub: 'user-1', role: 'admin' }),
      3600
    )
  })

  it('issues a session and JWT encoding the role for valid member credentials', async () => {
    const memberUser: UserEntity = { ...adminUser, userId: 'user-2', email: 'member@titvo.dev', role: 'member' }
    vi.spyOn(userRepository, 'findByEmail').mockResolvedValue(memberUser)
    vi.spyOn(passwordHasherService, 'verify').mockResolvedValue(true)

    const result = await loginUseCase.execute('member@titvo.dev', 'correct-password')

    expect(result.user).toEqual({ userId: 'user-2', email: 'member@titvo.dev', role: 'member' })
    expect(jwtService.sign).toHaveBeenCalledWith(
      expect.objectContaining({ sub: 'user-2', role: 'member' }),
      3600
    )
  })

  it('rejects an unknown email with InvalidCredentialsError and creates no session', async () => {
    vi.spyOn(userRepository, 'findByEmail').mockResolvedValue(null)

    await expect(loginUseCase.execute('unknown@titvo.dev', 'whatever')).rejects.toThrow(InvalidCredentialsError)
    expect(sessionRepository.create).not.toHaveBeenCalled()
    expect(jwtService.sign).not.toHaveBeenCalled()
  })

  it('rejects a wrong password with InvalidCredentialsError and creates no session', async () => {
    vi.spyOn(userRepository, 'findByEmail').mockResolvedValue(adminUser)
    vi.spyOn(passwordHasherService, 'verify').mockResolvedValue(false)

    await expect(loginUseCase.execute('admin@titvo.dev', 'wrong-password')).rejects.toThrow(InvalidCredentialsError)
    expect(sessionRepository.create).not.toHaveBeenCalled()
    expect(jwtService.sign).not.toHaveBeenCalled()
  })

  it('rejects unknown email and wrong password with the same error message (no user-enumeration signal)', async () => {
    vi.spyOn(userRepository, 'findByEmail').mockResolvedValue(null)
    let unknownEmailMessage = ''
    try {
      await loginUseCase.execute('unknown@titvo.dev', 'whatever')
    } catch (error) {
      unknownEmailMessage = (error as Error).message
    }

    vi.spyOn(userRepository, 'findByEmail').mockResolvedValue(adminUser)
    vi.spyOn(passwordHasherService, 'verify').mockResolvedValue(false)
    let wrongPasswordMessage = ''
    try {
      await loginUseCase.execute('admin@titvo.dev', 'wrong-password')
    } catch (error) {
      wrongPasswordMessage = (error as Error).message
    }

    expect(unknownEmailMessage).toBe(wrongPasswordMessage)
    expect(unknownEmailMessage.length).toBeGreaterThan(0)
  })

  it('rejects an inactive user with the same generic InvalidCredentialsError and creates no session', async () => {
    const inactiveUser: UserEntity = { ...adminUser, userId: 'user-3', email: 'inactive@titvo.dev', status: 'inactive' }
    vi.spyOn(userRepository, 'findByEmail').mockResolvedValue(inactiveUser)
    vi.spyOn(passwordHasherService, 'verify').mockResolvedValue(true)

    await expect(loginUseCase.execute('inactive@titvo.dev', 'correct-password')).rejects.toThrow(InvalidCredentialsError)
    expect(sessionRepository.create).not.toHaveBeenCalled()
    expect(jwtService.sign).not.toHaveBeenCalled()
  })

  it('logs in a user with an explicit "active" status (non-regression on the new field)', async () => {
    const activeUser: UserEntity = { ...adminUser, userId: 'user-4', email: 'active@titvo.dev', status: 'active' }
    vi.spyOn(userRepository, 'findByEmail').mockResolvedValue(activeUser)
    vi.spyOn(passwordHasherService, 'verify').mockResolvedValue(true)

    const result = await loginUseCase.execute('active@titvo.dev', 'correct-password')

    expect(result.user).toEqual({ userId: 'user-4', email: 'active@titvo.dev', role: 'admin' })
  })

  it('rejects the same generic message for an inactive user as for wrong credentials (no status-enumeration signal)', async () => {
    const inactiveUser: UserEntity = { ...adminUser, userId: 'user-5', email: 'inactive2@titvo.dev', status: 'inactive' }
    vi.spyOn(userRepository, 'findByEmail').mockResolvedValue(inactiveUser)
    vi.spyOn(passwordHasherService, 'verify').mockResolvedValue(true)
    let inactiveMessage = ''
    try {
      await loginUseCase.execute('inactive2@titvo.dev', 'correct-password')
    } catch (error) {
      inactiveMessage = (error as Error).message
    }

    vi.spyOn(userRepository, 'findByEmail').mockResolvedValue(adminUser)
    vi.spyOn(passwordHasherService, 'verify').mockResolvedValue(false)
    let wrongPasswordMessage = ''
    try {
      await loginUseCase.execute('admin@titvo.dev', 'wrong-password')
    } catch (error) {
      wrongPasswordMessage = (error as Error).message
    }

    expect(inactiveMessage).toBe(wrongPasswordMessage)
    expect(inactiveMessage.length).toBeGreaterThan(0)
  })
})
