import { Injectable, Logger } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { UserRepository } from '@auth/core/user/user.repository'
import { PasswordHasherService } from '@auth/app/auth/password-hasher.service'
import { UserAlreadyExistsError } from '@auth/app/user/user.error'
import { UserEntity, UserRole } from '@auth/core/user/user.entity'

/**
 * Admin-sets-initial-password invite flow (design proposal — no email
 * infra): an admin creates a new user directly with a chosen password,
 * hashed with the same `PasswordHasherService`/bcryptjs used by
 * `LoginUseCase`. The raw password is used only to derive the hash and
 * is never persisted, logged, or returned.
 */
@Injectable()
export class CreateUserUseCase {
  private readonly logger = new Logger(CreateUserUseCase.name)

  constructor (
    private readonly userRepository: UserRepository,
    private readonly passwordHasherService: PasswordHasherService
  ) { }

  async execute (email: string, password: string, role: UserRole): Promise<UserEntity> {
    const existing = await this.userRepository.findByEmail(email)

    if (existing !== null) {
      this.logger.warn('User creation rejected: email already exists')
      throw new UserAlreadyExistsError(`A user with email ${email} already exists`)
    }

    const passwordHash = await this.passwordHasherService.hash(password)
    const now = new Date().toISOString()

    return await this.userRepository.create({
      userId: randomUUID(),
      email,
      passwordHash,
      role,
      status: 'active',
      createdAt: now,
      updatedAt: now
    })
  }
}
