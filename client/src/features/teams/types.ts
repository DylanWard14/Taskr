export type TeamRole = 'owner' | 'admin' | 'member'

export interface Team {
  id: string
  name: string
}

export interface TeamMember {
  user_id: string
  email: string
  name: string
  role: TeamRole
}

export interface CreateTeamInput {
  name: string
}

export interface AddTeamMemberInput {
  email: string
  role?: TeamRole
}

// Deliberately excludes "owner" — ownership transfer isn't supported through
// the generic role-update endpoint (see server/src/modules/teams/schema.ts).
export type UpdatableTeamRole = Exclude<TeamRole, 'owner'>

export interface UpdateMemberRoleInput {
  role: UpdatableTeamRole
}
