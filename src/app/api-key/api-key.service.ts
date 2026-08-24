import { Injectable, Logger } from '@nestjs/common'
import { ApiKeyRepository } from '@auth/core/api-key/api-key.repository'
import { createHash } from 'crypto'
import { ApiKeyEntity } from '@auth/core/api-key/api-key.entity'
import { AesService } from '@titvo/shared'
@Injectable()
export class ValidateApiKeyUseCase {
  private readonly logger = new Logger(ValidateApiKeyUseCase.name)

  constructor (
    private readonly apiKeyRepository: ApiKeyRepository,
    private readonly aesService: AesService
  ) { }

  private isSha256 (apiKey: string): boolean {
    return /^[a-fA-F0-9]{64}$/.test(apiKey)
  }

  private isEncrypted (apiKey: string): boolean {
    return apiKey.startsWith('ENC:')
  }

  async execute (apiKey: string | undefined): Promise<ApiKeyEntity> {
    if (apiKey === undefined) {
      throw Object.assign(new Error('API key not found'), { name: 'ApiKeyNotFoundError' })
    }

    let rawApiKey: string = apiKey

    if (this.isEncrypted(apiKey)) {
      this.logger.debug('Decrypting API key')
      rawApiKey = await this.aesService.decrypt(apiKey.slice(4))
      this.logger.debug(`Decrypted API key: '${rawApiKey.slice(0, 5)}...${rawApiKey.slice(-5)}'`)
    }

    // Hash the API key with SHA-256
    const hashedApiKey: string = this.isSha256(rawApiKey) ? rawApiKey : createHash('sha256').update(rawApiKey).digest('hex')

    this.logger.debug(`Hashed API key: '${hashedApiKey}'`)

    // Find the API key in the repository
    const apiKeyRecord = await this.apiKeyRepository.findByApiKey(hashedApiKey)

    if (apiKeyRecord === null) {
      this.logger.warn('No API key found for apiKey')
      throw Object.assign(new Error('API key is not authorized'), { name: 'NoAuthorizedApiKeyError' })
    }

    // Backward compatibility (design D5): a MISSING `status` attribute
    // means active — every installer-minted key in prod predates this
    // field. Only an explicit 'revoked' rejects. Never check
    // `status === 'active'`, that would break every legacy key.
    if (apiKeyRecord.status === 'revoked') {
      this.logger.warn('API key rejected: revoked')
      throw Object.assign(new Error('API key is not authorized'), { name: 'NoAuthorizedApiKeyError' })
    }

    return apiKeyRecord
  }
}
