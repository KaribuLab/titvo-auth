import { UserEntity } from '@auth/core/user/user.entity'

export abstract class UserRepository {
  /**
   * Finds a user by email, using the `EmailIndex` GSI
   * @param email Email of the user
   * @returns UserEntity or null if not found
   */
  abstract findByEmail (email: string): Promise<UserEntity | null>

  /**
   * Finds a user by ID (hash key lookup)
   * @param userId ID of the user
   * @returns UserEntity or null if not found
   */
  abstract findById (userId: string): Promise<UserEntity | null>

  /**
   * Lists every user in the system. Backing implementations use a
   * `Scan` (design D6) — a single internal team, no multi-tenancy, does
   * not justify a dedicated role/status GSI. Used both to render the
   * admin console's user list and, on the caller side, to evaluate the
   * last-admin invariant (see `@auth/app/user/last-admin-guard`).
   * @returns All UserEntity records
   */
  abstract findAll (): Promise<UserEntity[]>

  /**
   * Persists a new user. `entity.passwordHash` MUST already be the
   * bcrypt hash of the chosen password — callers never pass plaintext
   * password material here.
   * @param entity User record to persist
   * @returns The persisted UserEntity
   */
  abstract create (entity: UserEntity): Promise<UserEntity>

  /**
   * Applies a partial update (role and/or status) to an existing user.
   * Used for soft deactivation (`status: 'inactive'`) and role changes.
   * @param userId ID of the user to update
   * @param patch Fields to update
   * @returns The updated UserEntity
   */
  abstract update (userId: string, patch: Partial<Pick<UserEntity, 'role' | 'status'>>): Promise<UserEntity>
}
