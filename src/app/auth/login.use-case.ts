import { Injectable, Logger } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { UserRepository } from '@auth/core/user/user.repository'
import { SessionRepository } from '@auth/core/session/session.repository'
import { PasswordHasherService } from '@auth/app/auth/password-hasher.service'
import { JwtService } from '@auth/app/auth/jwt.service'
import { InvalidCredentialsError } from '@auth/app/auth/auth.error'
import { UserRole } from '@auth/core/user/user.entity'
import { SESSION_TTL_SECONDS } from '@auth/app/auth/session.constants'

export interface LoginResult {
  token: string
  user: {
    userId: string
    email: string
    role: UserRole
  }
}

// A fixed dummy hash so the bcrypt.compare() timing cost is paid on the
// "unknown email" path too — avoids leaking which branch was hit via
// response-time side-channel. Never a real credential.
const DUMMY_HASH_FOR_TIMING_PARITY = '$2a$10$CwTycUXWue0Thq9StjUM0uJ8Q9CQg8ArNa9uQ4EG7v6PGZBz.ZJ3S'

@Injectable()
export class LoginUseCase {
  private readonly logger = new Logger(LoginUseCase.name)

  constructor (
    private readonly userRepository: UserRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly passwordHasherService: PasswordHasherService,
    private readonly jwtService: JwtService
  ) { }

  async execute (email: string, password: string): Promise<LoginResult> {
    const user = await this.userRepository.findByEmail(email)

    const passwordMatches = await this.passwordHasherService.verify(
      password,
      user?.passwordHash ?? DUMMY_HASH_FOR_TIMING_PARITY
    )

    // Inactive users (design D7) get the same generic rejection as a
    // wrong password — never a distinct error, so a deactivated user's
    // email cannot be distinguished from an unknown one or a wrong
    // password by the response alone (no status-enumeration signal).
    if (user === null || !passwordMatches || user.status === 'inactive') {
      this.logger.warn('Login rejected: invalid credentials')
      throw new InvalidCredentialsError('Invalid email or password')
    }

    const sessionId = randomUUID()
    const nowSeconds = Math.floor(Date.now() / 1000)

    await this.sessionRepository.create({
      sessionId,
      userId: user.userId,
      role: user.role,
      ttl: nowSeconds + SESSION_TTL_SECONDS,
      createdAt: new Date().toISOString()
    })

    const token = await this.jwtService.sign(
      { sub: user.userId, role: user.role, jti: sessionId },
      SESSION_TTL_SECONDS
    )

    return {
      token,
      user: { userId: user.userId, email: user.email, role: user.role }
    }
  }
}
