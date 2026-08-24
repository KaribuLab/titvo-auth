import { Injectable, Logger } from '@nestjs/common'
import { SessionRepository } from '@auth/core/session/session.repository'
import { JwtService } from '@auth/app/auth/jwt.service'

/**
 * Deletes the session row identified by the token's `jti` claim —
 * immediate revocation (design: "logout invalidates session immediately").
 * Idempotent/no-op on an already-invalid token: logout must always
 * succeed from the caller's perspective (204), never surface a 401.
 */
@Injectable()
export class LogoutUseCase {
  private readonly logger = new Logger(LogoutUseCase.name)

  constructor (
    private readonly sessionRepository: SessionRepository,
    private readonly jwtService: JwtService
  ) { }

  async execute (token: string): Promise<void> {
    let claims
    try {
      claims = await this.jwtService.verify(token)
    } catch {
      this.logger.debug('Logout no-op: token already invalid')
      return
    }

    await this.sessionRepository.deleteById(claims.jti)
  }
}
