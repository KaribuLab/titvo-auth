import { ApiKeyEntity } from '@auth/core/api-key/api-key.entity'

export abstract class ApiKeyRepository {
  /**
   * Finds an API Key by user ID
   * @param userId ID of the user
   * @returns ApiKeyDto or null if not found
   */
  abstract findByUserId (userId: string): Promise<ApiKeyEntity | null>

  /**
   * Finds an API Key by its value
   * @param apiKey Value of the API Key
   * @returns ApiKeyEntity or null if not found
   */
  abstract findByApiKey (apiKey: string): Promise<ApiKeyEntity | null>

  /**
   * Lists every API Key in the system. Keys are platform-wide and
   * admin-managed, not scoped to a single user.
   * @returns All ApiKeyEntity records
   */
  abstract findAll (): Promise<ApiKeyEntity[]>

  /**
   * Persists a new API Key. `entity.apiKey` MUST already be the SHA-256
   * hash of the raw key — callers never pass raw key material here.
   * @param entity API Key record to persist
   * @returns The persisted ApiKeyEntity
   */
  abstract create (entity: ApiKeyEntity): Promise<ApiKeyEntity>

  /**
   * Soft-revokes an API Key: sets `status: 'revoked'` and `revokedAt`.
   * Never a hard delete — the record and its audit trail are preserved.
   * @param keyId Unique identifier of the API Key to revoke
   * @returns The revoked ApiKeyEntity
   */
  abstract revoke (keyId: string): Promise<ApiKeyEntity>

  /**
   * Reverses a soft-revoke: sets `status: 'active'` and clears
   * `revokedAt`. Symmetric counterpart to `revoke`, added specifically to
   * support the last-active-key invariant's post-write re-count-and-
   * rollback mitigation (design risk resolution #1/#2 pattern, obs #884)
   * — a caller that raced past the pre-check and revoked the last active
   * key must be able to undo exactly that write.
   * @param keyId Unique identifier of the API Key to reactivate
   */
  abstract activate (keyId: string): Promise<void>
}
