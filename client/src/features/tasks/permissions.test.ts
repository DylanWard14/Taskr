import { describe, expect, it } from 'vitest'
import { canDeleteTask } from './permissions'

describe('canDeleteTask', () => {
  it('is true for owner and admin, false for member', () => {
    expect(canDeleteTask('owner')).toBe(true)
    expect(canDeleteTask('admin')).toBe(true)
    expect(canDeleteTask('member')).toBe(false)
  })
})
