import { AppError } from '@titvo/shared'

/**
  constructor (message: string) {

/**
 * Error thrown when the provided API key is invalid for the user
 */
export class InvalidApiKeyError extends AppError {
  constructor (message: string) {
    super('invalid-api-key', message)
  }
}

export class ApiKeyNotFoundError extends AppError {
  constructor (message: string) {
    super('api-key-not-found', message)
    this.name = 'ApiKeyNotFoundError'
  }
}

export class NoAuthorizedApiKeyError extends AppError {
  constructor (message: string) {
    super('no-authorized-api-key', message)
  }
}
