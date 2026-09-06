import { UserEntity } from '@auth/core/user/user.entity'

/**
 * Counts active admins in a snapshot of users. "Active" per design D7:
 * any user whose `status` is not explicitly `'inactive'` (missing means
 * active).
 *
 * Pure function — independent of how the snapshot was obtained. In
 * production a Dynamo-backed `UserRepository.findAll()` implementation
 * gets it via a `Scan` with `FilterExpression` on
 * `role='admin' AND status<>'inactive'` (design D6); here it is just an
 * in-memory array, which is what makes this fully unit-testable without
 * any database.
 * @param users Snapshot of users to evaluate
 * @returns Number of admins whose status is not `'inactive'`
 */
export function countActiveAdmins (users: UserEntity[]): number {
  return users.filter((u) => u.role === 'admin' && u.status !== 'inactive').length
}

/**
 * Pure predicate for the last-admin invariant (design D6): would
 * removing `targetUserId` from the active-admin set (by deactivation or
 * demotion) leave the platform with zero active admins?
 *
 * If the target is not currently an active admin (already inactive, or
 * not an admin at all), the action cannot remove an active admin, so
 * this always returns `false` — callers still need their own no-op/
 * idempotency handling, this guard only protects the invariant.
 * @param users Snapshot of users (a Scan+Filter result in production)
 * @param targetUserId ID of the user being deactivated or demoted
 * @returns `true` if the action would leave zero active admins
 */
export function wouldViolateLastAdminInvariant (users: UserEntity[], targetUserId: string): boolean {
  const target = users.find((u) => u.userId === targetUserId)

  if (target === undefined || target.role !== 'admin' || target.status === 'inactive') {
    return false
  }

  const remainingUsers = users.filter((u) => u.userId !== targetUserId)
  return countActiveAdmins(remainingUsers) === 0
}
