import { Injectable, Logger } from '@nestjs/common'
import { ApiKeyNotFoundError, NoAuthorizedApiKeyError } from '@auth/app/api-key/api-key.error'
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
      throw new ApiKeyNotFoundError('API key not found')
    }

    let rawApiKey = apiKey

    if (this.isEncrypted(apiKey)) {
      this.logger.debug('Decrypting API key')
      rawApiKey = await this.aesService.decrypt(apiKey.slice(4))
      this.logger.debug(`Decrypted API key: ${rawApiKey.slice(0, 5)}...${rawApiKey.slice(-5)}`)
    }

    // Hash the API key with SHA-256
    const hashedApiKey = this.isSha256(rawApiKey) ? rawApiKey : createHash('sha256').update(rawApiKey).digest('hex')

    this.logger.debug(`Hashed API key: ${hashedApiKey}`)

    // Find the API key in the repository
    const apiKeyRecord = await this.apiKeyRepository.findByApiKey(hashedApiKey)

    if (apiKeyRecord === null) {
      throw new NoAuthorizedApiKeyError('API key is not authorized')
    }

    return apiKeyRecord
  }
}
