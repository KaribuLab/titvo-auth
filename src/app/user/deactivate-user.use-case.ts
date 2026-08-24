import { Injectable, Logger } from '@nestjs/common'
import { UserRepository } from '@auth/core/user/user.repository'
import { UserEntity } from '@auth/core/user/user.entity'
import { LastAdminError } from '@auth/app/user/user.error'
import { countActiveAdmins, wouldViolateLastAdminInvariant } from '@auth/app/user/last-admin-guard'

/**
 * Soft-deactivates a user (design D7/D6). Enforces the last-admin
 * invariant with a two-step, non-atomic guard over the `UserRepository`'s
 * `findAll()` (a `Scan+Filter` in production — design D6, accepted race):
 *
 * 1. Pre-check: reject up front if this deactivation would leave zero
 *    active admins, based on a fresh snapshot.
 * 2. Post-write re-count (risk resolution #2): the pre-check is
 *    non-atomic, so a concurrent demote/deactivate could race past it.
 *    Immediately after writing, re-count active admins; if the write
 *    actually left zero, roll THIS specific write back and reject.
 */
@Injectable()
export class DeactivateUserUseCase {
  private readonly logger = new Logger(DeactivateUserUseCase.name)

  constructor (private readonly userRepository: UserRepository) { }

  async execute (userId: string): Promise<UserEntity> {
    const usersBeforeWrite = await this.userRepository.findAll()

    if (wouldViolateLastAdminInvariant(usersBeforeWrite, userId)) {
      this.logger.warn('Deactivation rejected: would leave zero active admins')
      throw new LastAdminError('Cannot deactivate the last active admin')
    }

    const updated = await this.userRepository.update(userId, { status: 'inactive' })

    const usersAfterWrite = await this.userRepository.findAll()

    if (countActiveAdmins(usersAfterWrite) === 0) {
      this.logger.warn('Deactivation raced the last-admin invariant post-write — rolling back')
      await this.userRepository.update(userId, { status: 'active' })
      throw new LastAdminError('Cannot deactivate the last active admin')
    }

    return updated
  }
}
