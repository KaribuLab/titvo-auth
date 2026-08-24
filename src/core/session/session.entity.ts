import { UserRole } from '@auth/core/user/user.entity'

/**
 * DTO representing an active login session, backed by the `session`
 * DynamoDB table (TTL attribute enabled — expired rows are reaped
 * automatically, in addition to the explicit expiry check on read).
 */
export interface SessionEntity {
  /**
   * Unique identifier of the session (hash key of the `session` table,
   * also encoded as the JWT's `jti` claim)
   */
  sessionId: string

  /**
   * ID of the user this session belongs to
   */
  userId: string

  /**
   * Role snapshotted at login time
   */
  role: UserRole

  /**
   * Epoch seconds at which this session expires (DynamoDB TTL attribute)
   */
  ttl: number

  /**
   * ISO-8601 timestamp of when the session was created
   */
  createdAt: string
}
