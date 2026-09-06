import { describe, it, expect } from 'vitest'
import { PasswordHasherService } from '@auth/app/auth/password-hasher.service'

describe('PasswordHasherService', () => {
  const service = new PasswordHasherService()

  it('hashes a password into a value different from the plaintext', async () => {
    const hash = await service.hash('correct-horse-battery-staple')

    expect(hash).not.toBe('correct-horse-battery-staple')
    expect(hash.length).toBeGreaterThan(0)
  })

  it('verifies a matching password against its hash as true', async () => {
    const hash = await service.hash('correct-horse-battery-staple')

    await expect(service.verify('correct-horse-battery-staple', hash)).resolves.toBe(true)
  })

  it('verifies a non-matching password against a hash as false', async () => {
    const hash = await service.hash('correct-horse-battery-staple')

    await expect(service.verify('wrong-password', hash)).resolves.toBe(false)
  })
})
