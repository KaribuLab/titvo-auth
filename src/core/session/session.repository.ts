import { SessionEntity } from '@auth/core/session/session.entity'

export abstract class SessionRepository {
  /**
   * Creates a new session row
   * @param session Session to persist
   */
  abstract create (session: SessionEntity): Promise<void>

  /**
   * Finds a session by its ID
   * @param sessionId ID of the session
   * @returns SessionEntity or null if not found
   */
  abstract findById (sessionId: string): Promise<SessionEntity | null>

  /**
   * Deletes a session by its ID (used by logout — immediate revocation)
   * @param sessionId ID of the session
   */
  abstract deleteById (sessionId: string): Promise<void>

  /**
   * Slides the session's TTL forward (60-min sliding expiry)
   * @param sessionId ID of the session
   * @param ttl New epoch-seconds expiry
   */
  abstract refreshTtl (sessionId: string, ttl: number): Promise<void>
}
