export class InvalidCredentialsError extends Error {
  constructor (message: string) {
    super(message)
    this.name = 'InvalidCredentialsError'
  }
}

export class SessionExpiredError extends Error {
  constructor (message: string) {
    super(message)
    this.name = 'SessionExpiredError'
  }
}

export class SessionInvalidError extends Error {
  constructor (message: string) {
    super(message)
    this.name = 'SessionInvalidError'
  }
}
