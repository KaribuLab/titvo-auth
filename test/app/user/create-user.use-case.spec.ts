import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CreateUserUseCase } from '@auth/app/user/create-user.use-case'
import { UserAlreadyExistsError } from '@auth/app/user/user.error'
import { UserRepository } from '@auth/core/user/user.repository'
import { PasswordHasherService } from '@auth/app/auth/password-hasher.service'
import { UserEntity } from '@auth/core/user/user.entity'

describe('CreateUserUseCase', () => {
  let userRepository: UserRepository
  let passwordHasherService: PasswordHasherService
  let useCase: CreateUserUseCase

  beforeEach(() => {
    userRepository = {
      findByEmail: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    } as unknown as UserRepository

    passwordHasherService = {
      hash: vi.fn(),
      verify: vi.fn()
    } as unknown as PasswordHasherService

    useCase = new CreateUserUseCase(userRepository, passwordHasherService)
  })

  it('hashes the password and persists a new active admin user', async () => {
    vi.spyOn(userRepository, 'findByEmail').mockResolvedValue(null)
    vi.spyOn(passwordHasherService, 'hash').mockResolvedValue('bcrypt-hash-abc')
    vi.spyOn(userRepository, 'create').mockImplementation(async (entity: UserEntity) => entity)

    const result = await useCase.execute('new-admin@titvo.dev', 'a-strong-password', 'admin')

    expect(passwordHasherService.hash).toHaveBeenCalledWith('a-strong-password')
    expect(userRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'new-admin@titvo.dev',
        passwordHash: 'bcrypt-hash-abc',
        role: 'admin',
        status: 'active'
      })
    )
    expect(result.email).toBe('new-admin@titvo.dev')
    expect(result.role).toBe('admin')
  })

  it('persists a new member user with a distinct role from an admin creation', async () => {
    vi.spyOn(userRepository, 'findByEmail').mockResolvedValue(null)
    vi.spyOn(passwordHasherService, 'hash').mockResolvedValue('bcrypt-hash-def')
    vi.spyOn(userRepository, 'create').mockImplementation(async (entity: UserEntity) => entity)

    const result = await useCase.execute('new-member@titvo.dev', 'another-password', 'member')

    expect(userRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'new-member@titvo.dev', role: 'member', status: 'active' })
    )
    expect(result.role).toBe('member')
  })

  it('never persists the plaintext password — only the hashed value reaches the repository', async () => {
    vi.spyOn(userRepository, 'findByEmail').mockResolvedValue(null)
    vi.spyOn(passwordHasherService, 'hash').mockResolvedValue('bcrypt-hash-xyz')
    vi.spyOn(userRepository, 'create').mockImplementation(async (entity: UserEntity) => entity)

    await useCase.execute('secure@titvo.dev', 'plaintext-secret', 'member')

    const persistedEntity = (userRepository.create as ReturnType<typeof vi.fn>).mock.calls[0][0] as UserEntity
    expect(JSON.stringify(persistedEntity)).not.toContain('plaintext-secret')
    expect(persistedEntity.passwordHash).toBe('bcrypt-hash-xyz')
  })

  it('rejects with UserAlreadyExistsError when the email is already registered, without hashing or creating', async () => {
    const existing: UserEntity = {
      userId: 'existing-1',
      email: 'taken@titvo.dev',
      passwordHash: 'old-hash',
      role: 'member',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    }
    vi.spyOn(userRepository, 'findByEmail').mockResolvedValue(existing)

    await expect(useCase.execute('taken@titvo.dev', 'whatever-password', 'member')).rejects.toThrow(UserAlreadyExistsError)
    expect(passwordHasherService.hash).not.toHaveBeenCalled()
    expect(userRepository.create).not.toHaveBeenCalled()
  })
})
