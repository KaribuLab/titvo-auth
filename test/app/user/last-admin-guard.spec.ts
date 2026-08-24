import { describe, it, expect } from 'vitest'
import { countActiveAdmins, wouldViolateLastAdminInvariant } from '@auth/app/user/last-admin-guard'
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

describe('countActiveAdmins', () => {
  it('counts only admins whose status is not "inactive"', () => {
    const users: UserEntity[] = [
      user({ userId: 'a1', role: 'admin' }),
      user({ userId: 'a2', role: 'admin', status: 'active' }),
      user({ userId: 'a3', role: 'admin', status: 'inactive' }),
      user({ userId: 'm1', role: 'member' })
    ]

    expect(countActiveAdmins(users)).toBe(2)
  })

  it('returns 0 for a set with no active admins', () => {
    const users: UserEntity[] = [
      user({ userId: 'a1', role: 'admin', status: 'inactive' }),
      user({ userId: 'm1', role: 'member' })
    ]

    expect(countActiveAdmins(users)).toBe(0)
  })
})

describe('wouldViolateLastAdminInvariant', () => {
  it('returns true when the target is the sole active admin', () => {
    const users: UserEntity[] = [
      user({ userId: 'a1', role: 'admin' }),
      user({ userId: 'm1', role: 'member' })
    ]

    expect(wouldViolateLastAdminInvariant(users, 'a1')).toBe(true)
  })

  it('returns false when another active admin remains', () => {
    const users: UserEntity[] = [
      user({ userId: 'a1', role: 'admin' }),
      user({ userId: 'a2', role: 'admin' })
    ]

    expect(wouldViolateLastAdminInvariant(users, 'a1')).toBe(false)
  })

  it('returns false when the target is not currently an active admin (already inactive)', () => {
    const users: UserEntity[] = [
      user({ userId: 'a1', role: 'admin', status: 'inactive' }),
      user({ userId: 'm1', role: 'member' })
    ]

    expect(wouldViolateLastAdminInvariant(users, 'a1')).toBe(false)
  })

  it('returns false when the target is a member, not an admin', () => {
    const users: UserEntity[] = [
      user({ userId: 'a1', role: 'admin' }),
      user({ userId: 'm1', role: 'member' })
    ]

    expect(wouldViolateLastAdminInvariant(users, 'm1')).toBe(false)
  })

  it('returns false when the target user is not found in the snapshot', () => {
    const users: UserEntity[] = [
      user({ userId: 'a1', role: 'admin' })
    ]

    expect(wouldViolateLastAdminInvariant(users, 'unknown')).toBe(false)
  })
})
