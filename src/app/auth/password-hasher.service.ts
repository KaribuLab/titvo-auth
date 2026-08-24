import { Injectable } from '@nestjs/common'
import * as bcrypt from 'bcryptjs'

const SALT_ROUNDS = 10

/**
 * Wraps bcryptjs (pure-JS, no native bindings — Lambda-safe, unlike
 * argon2) for password hashing/verification.
 */
@Injectable()
export class PasswordHasherService {
  async hash (password: string): Promise<string> {
    return await bcrypt.hash(password, SALT_ROUNDS)
  }

  async verify (password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash)
  }
}
