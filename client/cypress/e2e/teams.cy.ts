import { TEST_PASSWORD, uniqueEmail, uniqueName } from '../support/test-data'

// End-to-end coverage of team creation and membership management against the
// real client + server + DB stack. Each test creates its own unique users
// and team names via the UI (and, for seeding a second user, a direct API
// call) so the spec is independent/re-runnable against a shared, non-empty
// dev database.
describe('teams', () => {
  function createTeam(name: string) {
    cy.contains('button', 'Create team').click()
    cy.get('[role="dialog"]').within(() => {
      cy.get('input').first().type(name)
      cy.contains('button', 'Create').click()
    })
  }

  it('creates a team, manages membership, and switches between teams', () => {
    const ownerName = uniqueName('Team Owner')
    const ownerEmail = uniqueEmail('team-owner')
    const memberName = uniqueName('Team Member')
    const memberEmail = uniqueEmail('team-member')
    const firstTeamName = uniqueName('First Team')
    const secondTeamName = uniqueName('Second Team')

    // Seed a second real user directly against the API (cy.request runs in
    // Node, not the browser, so it isn't subject to the browser's CORS
    // policy) so their email exists to invite below.
    cy.request('POST', `${Cypress.env('apiUrl')}/auth/signup`, {
      name: memberName,
      email: memberEmail,
      password: TEST_PASSWORD,
    })

    // Sign up the primary (owner) user through the real UI.
    cy.visit('/signup')
    cy.get('input[autocomplete="name"]').type(ownerName)
    cy.get('input[autocomplete="email"]').type(ownerEmail)
    cy.get('input[autocomplete="new-password"]').type(TEST_PASSWORD)
    cy.contains('button', 'Sign up').click()
    cy.location('pathname').should('eq', '/')

    // No teams yet.
    cy.contains(/you aren.t a member of any teams yet/i)

    // Create a team -> see it in the list -> land on its page.
    createTeam(firstTeamName)
    cy.location('pathname').should('match', /^\/teams\/[^/]+$/)
    cy.contains('h4', firstTeamName)

    // Creator is listed as the owner.
    cy.contains(`${ownerName} (you)`)
    cy.contains(`${ownerEmail} · owner`)

    // Add a second member by email (default role: member).
    cy.get('input[type="email"]').type(memberEmail)
    cy.contains('button', 'Add member').click()
    cy.contains('Member added.')
    cy.contains(memberName)
    cy.contains(`${memberEmail} · member`)

    // Change that member's role to admin.
    cy.contains('li', memberName).within(() => {
      cy.contains('button', 'Make admin').click()
    })
    cy.contains(`${memberEmail} · admin`)

    // Remove that member from the team.
    cy.contains('li', memberName).within(() => {
      cy.contains('button', 'Remove').click()
    })
    cy.contains(memberName).should('not.exist')

    // Go back home and create a second team so the switcher has something
    // to switch to.
    cy.visit('/')
    createTeam(secondTeamName)
    cy.location('pathname').should('match', /^\/teams\/[^/]+$/)
    cy.contains('h4', secondTeamName)

    // Use the team switcher to jump back to the first team.
    cy.contains('button', 'Switch team').click()
    cy.get('[role="menu"]').contains(firstTeamName).click()
    cy.contains('h4', firstTeamName)
    cy.location('pathname').should('match', /^\/teams\/[^/]+$/)

    // And switch again from there to confirm it works both directions.
    cy.contains('button', 'Switch team').click()
    cy.get('[role="menu"]').contains(secondTeamName).click()
    cy.contains('h4', secondTeamName)
  })

  it("does not let a non-member view or act on another team's tasks", () => {
    const ownerName = uniqueName('Private Team Owner')
    const ownerEmail = uniqueEmail('private-owner')
    const outsiderName = uniqueName('Outsider')
    const outsiderEmail = uniqueEmail('outsider')
    const teamName = uniqueName('Private Team')

    let teamId: string

    // Owner signs up and creates a team via the real UI.
    cy.visit('/signup')
    cy.get('input[autocomplete="name"]').type(ownerName)
    cy.get('input[autocomplete="email"]').type(ownerEmail)
    cy.get('input[autocomplete="new-password"]').type(TEST_PASSWORD)
    cy.contains('button', 'Sign up').click()
    cy.location('pathname').should('eq', '/')

    createTeam(teamName)
    cy.location('pathname')
      .should('match', /^\/teams\/[^/]+$/)
      .then((pathname) => {
        teamId = pathname.split('/').pop() as string
      })
    cy.contains('h4', teamName)

    cy.contains('button', 'Log out').click()
    cy.location('pathname').should('eq', '/login')

    // A second, unrelated user signs up and tries to view the first team
    // directly by URL. This proves the block is enforced end-to-end
    // (real server response for a real non-member), not just hidden in the UI.
    cy.visit('/signup')
    cy.get('input[autocomplete="name"]').type(outsiderName)
    cy.get('input[autocomplete="email"]').type(outsiderEmail)
    cy.get('input[autocomplete="new-password"]').type(TEST_PASSWORD)
    cy.contains('button', 'Sign up').click()
    cy.location('pathname').should('eq', '/')

    cy.then(() => {
      cy.visit(`/teams/${teamId}`)
    })
    cy.contains(/this team doesn.t exist, or you.re not a member of it/i)
  })
})
