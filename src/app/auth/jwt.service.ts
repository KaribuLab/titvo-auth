import { Inject, Injectable } from '@nestjs/common'
import jwt from 'jsonwebtoken'
import { SecretService } from '@titvo/shared'
import { UserRole } from '@auth/core/user/user.entity'

export const JWT_SECRET_NAME_PROPERTY = 'JWT_SECRET_NAME'

/**
 * Session claims encoded in the JWT. `jti` maps 1:1 to the `session`
 * table's hash key, letting the guard revoke a session by deleting the
 * row (see design D4).
 */
export interface SessionClaims {
  sub: string
  role: UserRole
  jti: string
}

/**
 * Signs/verifies short-lived HS256 session JWTs. The signing key is
 * fetched from Secrets Manager (via SecretService) — a dedicated key,
 * separate from the shared AES key used for config-secret encryption
 * (key separation, per design D4).
 */
@Injectable()
export class JwtService {
  constructor (
    private readonly secretService: SecretService,
    @Inject(JWT_SECRET_NAME_PROPERTY) private readonly jwtSecretName: string
  ) { }

  async sign (claims: SessionClaims, expiresInSeconds: number): Promise<string> {
    const secret = await this.secretService.get(this.jwtSecretName)
    if (secret === undefined) {
      throw new Error('JWT secret not found')
    }
    return jwt.sign(claims, secret, { algorithm: 'HS256', expiresIn: expiresInSeconds })
  }

  async verify (token: string): Promise<SessionClaims> {
    const secret = await this.secretService.get(this.jwtSecretName)
    if (secret === undefined) {
      throw new Error('JWT secret not found')
    }
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] })
    return decoded as unknown as SessionClaims
  }
}
