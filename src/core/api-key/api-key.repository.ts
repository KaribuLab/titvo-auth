import { ApiKeyEntity } from '@core/api-key/api-key.entity'

export abstract class ApiKeyRepository {

  /**
   * Finds an API Key by user ID
   * @param userId ID of the user
   * @returns ApiKeyDto or null if not found
   */
  abstract findByUserId(userId: string): Promise<ApiKeyEntity | null>

  /**
   * Finds an API Key by its value
   * @param apiKey Value of the API Key
   * @returns ApiKeyEntity or null if not found
   */
  abstract findByApiKey(apiKey: string): Promise<ApiKeyEntity | null>
}