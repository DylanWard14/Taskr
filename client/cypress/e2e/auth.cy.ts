import { TEST_PASSWORD, uniqueEmail, uniqueName } from '../support/test-data'

// End-to-end coverage of the auth flow (signup, login, logout, invalid
// credentials, and the unauthenticated-redirect route guard) against the
// real client + server + DB stack. Each test creates its own unique user via
// the UI so the spec is independent/re-runnable against a shared, non-empty
// dev database.
describe('auth', () => {
  function signUp(name: string, email: string, password: string) {
    cy.visit('/signup')
    cy.get('input[autocomplete="name"]').type(name)
    cy.get('input[autocomplete="email"]').type(email)
    cy.get('input[autocomplete="new-password"]').type(password)
    cy.contains('button', 'Sign up').click()
  }

  function logIn(email: string, password: string) {
    cy.visit('/login')
    cy.get('input[autocomplete="email"]').type(email)
    cy.get('input[autocomplete="current-password"]').type(password)
    cy.contains('button', 'Log in').click()
  }

  it('signs up a new user, logs out, and logs back in with the same credentials', () => {
    const name = uniqueName('Auth Test User')
    const email = uniqueEmail('auth-signup')

    signUp(name, email, TEST_PASSWORD)

    // A successful signup lands the now-authenticated user on the home page.
    cy.location('pathname').should('eq', '/')
    cy.contains(`Signed in as ${name}`)

    cy.contains('button', 'Log out').click()
    cy.location('pathname').should('eq', '/login')

    logIn(email, TEST_PASSWORD)

    cy.location('pathname').should('eq', '/')
    cy.contains(`Signed in as ${name}`)
  })

  it('shows an error and stays on the login page for the wrong password', () => {
    const name = uniqueName('Bad Login User')
    const email = uniqueEmail('auth-badlogin')

    // Create the account first so the email is real; sign back out so we can
    // exercise the login form directly.
    signUp(name, email, TEST_PASSWORD)
    cy.location('pathname').should('eq', '/')
    cy.contains('button', 'Log out').click()
    cy.location('pathname').should('eq', '/login')

    logIn(email, 'the-wrong-password')

    cy.contains('Invalid email or password')
    cy.location('pathname').should('eq', '/login')
  })

  it('redirects an unauthenticated visitor from / to /login', () => {
    cy.visit('/')
    cy.location('pathname').should('eq', '/login')
  })
})
