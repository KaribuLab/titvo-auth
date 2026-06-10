export class InvalidApiKeyError extends Error {
  constructor (message: string) {
    super(message)
    this.name = 'InvalidApiKeyError'
  }
}

export class ApiKeyNotFoundError extends Error {
  constructor (message: string) {
    super(message)
    this.name = 'ApiKeyNotFoundError'
  }
}

export class NoAuthorizedApiKeyError extends Error {
  constructor (message: string) {
    super(message)
    this.name = 'NoAuthorizedApiKeyError'
  }
}
