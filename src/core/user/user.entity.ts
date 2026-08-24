/**
 * Role assigned to a user. `admin` may write config entries in the admin
 * console; `member` is read-only. No further RBAC granularity — out of
 * scope per the titvo-admin-console proposal's non-goals.
 */
export type UserRole = 'admin' | 'member'

/**
 * Lifecycle status of a user. `inactive` blocks login.
 *
 * Backward compatibility (design D7): the `status` attribute is ABSENT on
 * every user persisted before this field existed. Absence MUST be treated
 * as `active` — never require `status === 'active'`, always check
 * `status !== 'inactive'`. Deactivation is soft (never a hard delete) so
 * audit trail and `apikey.user_id` referential integrity are preserved.
 */
export type UserStatus = 'active' | 'inactive'

/**
 * DTO representing a human user of the admin console.
 */
export interface UserEntity {
  /**
   * Unique identifier of the user (hash key of the `user` table)
   */
  userId: string

  /**
   * Email address of the user (queryable via the `EmailIndex` GSI)
   */
  email: string

  /**
   * bcrypt hash of the user's password — never the plaintext password
   */
  passwordHash: string

  /**
   * Role granted to the user
   */
  role: UserRole

  /**
   * Lifecycle status. Optional/backward-tolerant — absence means active,
   * see `UserStatus`.
   */
  status?: UserStatus

  /**
   * ISO-8601 timestamp of when the user was created
   */
  createdAt: string

  /**
   * ISO-8601 timestamp of the last update to the user
   */
  updatedAt: string
}
