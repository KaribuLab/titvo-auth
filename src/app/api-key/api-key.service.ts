import { Injectable, Logger } from '@nestjs/common'
import { ApiKeyNotFoundError, NoAuthorizedApiKeyError } from '@app/api-key/api-key.error'
import { ApiKeyRepository } from '@core/api-key/api-key.repository'
import { createHash } from 'crypto'
import { ApiKeyEntity } from '@core/api-key/api-key.entity'
@Injectable()
export class ValidateApiKeyUseCase {
  private readonly logger = new Logger(ValidateApiKeyUseCase.name)

  constructor(
    private readonly apiKeyRepository: ApiKeyRepository
  ) { }

  private isSha256(apiKey: string): boolean {
    return /^[a-fA-F0-9]{64}$/.test(apiKey)
  }

  async execute(apiKey: string | undefined): Promise<ApiKeyEntity> {
    if (apiKey === undefined) {
      throw new ApiKeyNotFoundError('API key not found')
    }

    // Hash the API key with SHA-256
    const hashedApiKey = this.isSha256(apiKey) ? apiKey : createHash('sha256').update(apiKey).digest('hex')

    this.logger.debug(`Hashed API key: ${hashedApiKey}`)

    // Find the API key in the repository
    const apiKeyRecord = await this.apiKeyRepository.findByApiKey(hashedApiKey)

    if (apiKeyRecord === null) {
      throw new NoAuthorizedApiKeyError('API key is not authorized')
    }

    return apiKeyRecord
  }
}
