import { describe, expect, it } from 'vitest'
import { assignableRoles, canChangeRole, canManageMembers, canRemoveMember } from './permissions'
import type { TeamMember } from './types'

const owner: TeamMember = { user_id: 'u-owner', email: 'owner@example.com', name: 'Owner', role: 'owner' }
const admin: TeamMember = { user_id: 'u-admin', email: 'admin@example.com', name: 'Admin', role: 'admin' }
const member: TeamMember = { user_id: 'u-member', email: 'member@example.com', name: 'Member', role: 'member' }

describe('canManageMembers', () => {
  it('is true for owner and admin, false for member', () => {
    expect(canManageMembers('owner')).toBe(true)
    expect(canManageMembers('admin')).toBe(true)
    expect(canManageMembers('member')).toBe(false)
  })
})

describe('assignableRoles', () => {
  it('lets an owner assign owner, admin, or member', () => {
    expect(assignableRoles('owner')).toEqual(['member', 'admin', 'owner'])
  })

  it('does not let an admin assign the owner role', () => {
    expect(assignableRoles('admin')).toEqual(['member', 'admin'])
  })
})

describe('canChangeRole', () => {
  it('allows an owner to change another member role', () => {
    expect(canChangeRole('owner', owner.user_id, member)).toBe(true)
  })

  it('blocks an owner from changing their own role', () => {
    expect(canChangeRole('owner', owner.user_id, owner)).toBe(false)
  })

  it('blocks an admin from changing anyone role', () => {
    expect(canChangeRole('admin', admin.user_id, member)).toBe(false)
  })

  it('blocks a member from changing anyone role', () => {
    expect(canChangeRole('member', member.user_id, member)).toBe(false)
  })
})

describe('canRemoveMember', () => {
  it('always allows self-removal (leave team)', () => {
    expect(canRemoveMember('member', member.user_id, member)).toBe(true)
    expect(canRemoveMember('admin', admin.user_id, admin)).toBe(true)
    expect(canRemoveMember('owner', owner.user_id, owner)).toBe(true)
  })

  it('lets an owner remove an admin or another owner', () => {
    expect(canRemoveMember('owner', 'other-owner', admin)).toBe(true)
    expect(canRemoveMember('owner', 'other-owner', owner)).toBe(true)
  })

  it('lets an owner remove a plain member', () => {
    expect(canRemoveMember('owner', 'other-owner', member)).toBe(true)
  })

  it('lets an admin remove only a plain member, not another admin or an owner', () => {
    expect(canRemoveMember('admin', 'other-admin', member)).toBe(true)
    expect(canRemoveMember('admin', 'other-admin', admin)).toBe(false)
    expect(canRemoveMember('admin', 'other-admin', owner)).toBe(false)
  })

  it('blocks a plain member from removing anyone else', () => {
    expect(canRemoveMember('member', 'other-member', member)).toBe(false)
    expect(canRemoveMember('member', 'other-member', admin)).toBe(false)
    expect(canRemoveMember('member', 'other-member', owner)).toBe(false)
  })
})
