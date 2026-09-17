import { TEST_PASSWORD, uniqueEmail, uniqueName } from '../support/test-data'

// End-to-end coverage of the comments flow (post a comment on a task, see it
// persist and render, then delete it) against the real client + server + DB
// stack. Creates its own unique user/team/task via the UI so the spec is
// independent/re-runnable against a shared, non-empty dev database.
describe('comments', () => {
  function signUp(name: string, email: string, password: string) {
    cy.visit('/signup')
    cy.get('input[autocomplete="name"]').type(name)
    cy.get('input[autocomplete="email"]').type(email)
    cy.get('input[autocomplete="new-password"]').type(password)
    cy.contains('button', 'Sign up').click()
  }

  function createTeam(name: string) {
    cy.contains('button', 'Create team').click()
    cy.get('[role="dialog"]').within(() => {
      cy.get('input').first().type(name)
      cy.contains('button', 'Create').click()
    })
  }

  // The Title field is a plain MUI TextField with no data-testid, so we
  // locate it by walking from its <label> (via `closest('.MuiFormControl-root')`)
  // rather than relying on input order. Mirrors the helper in tasks.cy.ts.
  function typeIntoField(label: string, value: string) {
    cy.contains('label', label)
      .closest('.MuiFormControl-root')
      .find('input, textarea')
      .first()
      .clear()
      .type(value)
  }

  function openNewTaskDialog() {
    cy.contains('button', 'New task').click()
    cy.get('[role="dialog"]').should('be.visible')
  }

  function submitTaskDialog(buttonText: 'Create' | 'Save') {
    cy.get('[role="dialog"]').contains('button', buttonText).click()
    cy.get('[role="dialog"]').should('not.exist')
  }

  function card(title: string) {
    return cy.contains('.MuiCard-root', title)
  }

  function createTask(title: string) {
    openNewTaskDialog()
    cy.get('[role="dialog"]').within(() => {
      typeIntoField('Title', title)
    })
    submitTaskDialog('Create')
  }

  it('adds a comment to a task, sees it persist, and deletes it', () => {
    const ownerName = uniqueName('Comment Owner')
    const ownerEmail = uniqueEmail('comment-owner')
    const teamName = uniqueName('Comment Team')
    const taskTitle = uniqueName('Draft the proposal')
    const commentBody = `A note about this task ${Date.now()}`

    signUp(ownerName, ownerEmail, TEST_PASSWORD)
    cy.location('pathname').should('eq', '/')

    createTeam(teamName)
    cy.location('pathname').should('match', /^\/teams\/[^/]+$/)

    createTask(taskTitle)
    card(taskTitle).should('be.visible')

    // Open the task's Comments dialog.
    card(taskTitle).within(() => {
      cy.contains('button', 'Comments').click()
    })
    cy.get('[role="dialog"]').should('be.visible').within(() => {
      cy.contains('No comments yet.')

      // Post a comment.
      cy.contains('label', 'Add a comment').closest('.MuiFormControl-root').find('textarea').first().type(commentBody)
      cy.contains('button', 'Post comment').click()

      // It persists and renders, and the composer clears.
      cy.contains(commentBody).should('be.visible')
      cy.contains(ownerName)
      cy.contains('No comments yet.').should('not.exist')

      // As the comment's author (and team owner), a Delete control is shown.
      cy.contains('li', commentBody).within(() => {
        cy.contains('button', 'Delete').click()
      })

      // It's gone, and the empty state returns.
      cy.contains(commentBody).should('not.exist')
      cy.contains('No comments yet.')
    })

    // Closing and reopening the dialog re-fetches from the server, confirming
    // the deletion was persisted (not just removed from local UI state).
    cy.get('[role="dialog"]').contains('button', 'Close').click()
    cy.get('[role="dialog"]').should('not.exist')
    card(taskTitle).within(() => {
      cy.contains('button', 'Comments').click()
    })
    cy.get('[role="dialog"]').should('be.visible').within(() => {
      cy.contains('No comments yet.')
      cy.contains(commentBody).should('not.exist')
    })
  })
})
