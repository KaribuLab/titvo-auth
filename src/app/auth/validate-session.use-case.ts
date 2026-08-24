import { Injectable, Logger } from '@nestjs/common'
import { UserRepository } from '@auth/core/user/user.repository'
import { SessionRepository } from '@auth/core/session/session.repository'
import { JwtService } from '@auth/app/auth/jwt.service'
import { SessionExpiredError, SessionInvalidError } from '@auth/app/auth/auth.error'
import { UserRole } from '@auth/core/user/user.entity'
import { SESSION_TTL_SECONDS } from '@auth/app/auth/session.constants'

export interface ValidatedSession {
  userId: string
  email: string
  role: UserRole
}

/**
 * Verifies a session JWT, loads the corresponding `session` row, rejects
 * missing/expired/mismatched sessions, and slides the TTL forward on
 * success (design D4/D5). Backs `GET /auth/me` and doubles as the guard
 * logic reused by any future authenticated endpoint.
 */
@Injectable()
export class ValidateSessionUseCase {
  private readonly logger = new Logger(ValidateSessionUseCase.name)

  constructor (
    private readonly userRepository: UserRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly jwtService: JwtService
  ) { }

  async execute (token: string): Promise<ValidatedSession> {
    let claims
    try {
      claims = await this.jwtService.verify(token)
    } catch (error) {
      this.logger.warn(`Session rejected: token failed verification (${error instanceof Error ? error.message : 'unknown error'})`)
      throw new SessionInvalidError('Invalid or expired session token')
    }

    const session = await this.sessionRepository.findById(claims.jti)
    const nowSeconds = Math.floor(Date.now() / 1000)

    if (session === null || session.ttl < nowSeconds) {
      this.logger.warn('Session rejected: session row missing or expired')
      throw new SessionExpiredError('Session has expired')
    }

    if (session.userId !== claims.sub || session.role !== claims.role) {
      this.logger.warn('Session rejected: session row does not match token claims')
      throw new SessionInvalidError('Session does not match token claims')
    }

    const user = await this.userRepository.findById(session.userId)
    if (user === null) {
      throw new SessionInvalidError('User no longer exists')
    }

    await this.sessionRepository.refreshTtl(session.sessionId, nowSeconds + SESSION_TTL_SECONDS)

    return { userId: user.userId, email: user.email, role: user.role }
  }
}
