import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DeactivateUserUseCase } from '@auth/app/user/deactivate-user.use-case'
import { LastAdminError } from '@auth/app/user/user.error'
import { UserRepository } from '@auth/core/user/user.repository'
import { UserEntity } from '@auth/core/user/user.entity'

function user (overrides: Partial<UserEntity>): UserEntity {
  return {
    userId: 'user-x',
    email: 'x@titvo.dev',
    passwordHash: 'hash',
    role: 'member',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  }
}

describe('DeactivateUserUseCase', () => {
  let userRepository: UserRepository
  let useCase: DeactivateUserUseCase

  beforeEach(() => {
    userRepository = {
      findByEmail: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    } as unknown as UserRepository

    useCase = new DeactivateUserUseCase(userRepository)
  })

  it('deactivates a member without touching the admin count', async () => {
    const member = user({ userId: 'm1', role: 'member' })
    const admin = user({ userId: 'a1', role: 'admin' })
    vi.spyOn(userRepository, 'findAll')
      .mockResolvedValueOnce([member, admin])
      .mockResolvedValueOnce([{ ...member, status: 'inactive' }, admin])
    vi.spyOn(userRepository, 'update').mockResolvedValue({ ...member, status: 'inactive' })

    const result = await useCase.execute('m1')

    expect(userRepository.update).toHaveBeenCalledWith('m1', { status: 'inactive' })
    expect(result.status).toBe('inactive')
  })

  it('deactivates one of two admins, leaving one active admin', async () => {
    const admin1 = user({ userId: 'a1', role: 'admin' })
    const admin2 = user({ userId: 'a2', role: 'admin' })
    vi.spyOn(userRepository, 'findAll')
      .mockResolvedValueOnce([admin1, admin2])
      .mockResolvedValueOnce([{ ...admin1, status: 'inactive' }, admin2])
    vi.spyOn(userRepository, 'update').mockResolvedValue({ ...admin1, status: 'inactive' })

    const result = await useCase.execute('a1')

    expect(result.status).toBe('inactive')
    expect(userRepository.update).toHaveBeenCalledTimes(1)
  })

  it('rejects deactivating the sole active admin with LastAdminError, without writing', async () => {
    const soleAdmin = user({ userId: 'a1', role: 'admin' })
    const member = user({ userId: 'm1', role: 'member' })
    vi.spyOn(userRepository, 'findAll').mockResolvedValue([soleAdmin, member])

    await expect(useCase.execute('a1')).rejects.toThrow(LastAdminError)
    expect(userRepository.update).not.toHaveBeenCalled()
  })

  it('rolls back the write when a concurrent race leaves zero active admins post-write (risk resolution #2)', async () => {
    // Pre-check sees two active admins (a1, a2) so it passes. Between the
    // pre-check and the write, a concurrent request deactivates a2. The
    // post-write re-count must catch this and roll the write back.
    const admin1 = user({ userId: 'a1', role: 'admin' })
    const admin2 = user({ userId: 'a2', role: 'admin' })
    vi.spyOn(userRepository, 'findAll')
      .mockResolvedValueOnce([admin1, admin2]) // pre-check: 2 active admins, passes
      .mockResolvedValueOnce([{ ...admin1, status: 'inactive' }, { ...admin2, status: 'inactive' }]) // post-write: raced, 0 active admins
    vi.spyOn(userRepository, 'update').mockResolvedValue({ ...admin1, status: 'inactive' })

    await expect(useCase.execute('a1')).rejects.toThrow(LastAdminError)

    expect(userRepository.update).toHaveBeenNthCalledWith(1, 'a1', { status: 'inactive' })
    expect(userRepository.update).toHaveBeenNthCalledWith(2, 'a1', { status: 'active' })
    expect(userRepository.update).toHaveBeenCalledTimes(2)
  })
})
