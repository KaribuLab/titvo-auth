export class UserAlreadyExistsError extends Error {
  constructor (message: string) {
    super(message)
    this.name = 'UserAlreadyExistsError'
  }
}

export class LastAdminError extends Error {
  constructor (message: string) {
    super(message)
    this.name = 'LastAdminError'
  }
}
