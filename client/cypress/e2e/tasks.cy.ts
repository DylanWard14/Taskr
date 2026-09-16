import { TEST_PASSWORD, uniqueEmail, uniqueName } from '../support/test-data'

// End-to-end coverage of the kanban task board flow (create/edit/delete a
// task, move it across statuses, and see assignee/priority/due-date fields
// persist and render) against the real client + server + DB stack. Each test
// creates its own unique user/team via the UI so the spec is
// independent/re-runnable against a shared, non-empty dev database.
describe('tasks', () => {
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

  // The Title/Description/Due date fields are plain MUI TextFields with no
  // data-testid, so we locate each by walking from its <label> (via
  // `closest('.MuiFormControl-root')`) rather than relying on input order,
  // which is fragile once the layout changes. See report for a note flagging
  // these missing test hooks to the frontend engineer.
  function typeIntoField(label: string, value: string) {
    cy.contains('label', label)
      .closest('.MuiFormControl-root')
      .find('input, textarea')
      .first()
      .clear()
      .type(value)
  }

  // MUI's Select renders a div[role="combobox"] (not a native <select>), so
  // opening it and picking an option requires clicking to open the listbox
  // popover (which portals to the end of <body>, outside the dialog) and
  // then clicking the option there.
  function chooseSelect(label: string, optionText: string) {
    cy.contains('label', label)
      .invoke('attr', 'for')
      .then((id) => {
        cy.get(`#${id}`).click()
      })
    cy.get('ul[role="listbox"]').contains('li', optionText).click()
  }

  function openNewTaskDialog() {
    cy.contains('button', 'New task').click()
    cy.get('[role="dialog"]').should('be.visible')
  }

  function submitTaskDialog(buttonText: 'Create' | 'Save') {
    cy.get('[role="dialog"]').contains('button', buttonText).click()
    cy.get('[role="dialog"]').should('not.exist')
  }

  function column(title: string) {
    return cy.contains('h6', title).closest('.MuiPaper-root')
  }

  function card(title: string) {
    return cy.contains('.MuiCard-root', title)
  }

  it('creates, moves, edits, and deletes a task on the board', () => {
    const ownerName = uniqueName('Board Owner')
    const ownerEmail = uniqueEmail('board-owner')
    const teamName = uniqueName('Board Team')
    const taskTitle = uniqueName('Write the report')
    const updatedTitle = uniqueName('Write the final report')

    signUp(ownerName, ownerEmail, TEST_PASSWORD)
    cy.location('pathname').should('eq', '/')

    createTeam(teamName)
    cy.location('pathname').should('match', /^\/teams\/[^/]+$/)
    cy.contains('h4', teamName)

    // Empty board to start.
    column('Todo').should('contain.text', 'No tasks here.')

    // Create a task with title, description, priority, and due date.
    openNewTaskDialog()
    cy.get('[role="dialog"]').within(() => {
      typeIntoField('Title', taskTitle)
      typeIntoField('Description', 'Pull together the quarterly numbers.')
    })
    chooseSelect('Priority', 'high')
    cy.get('[role="dialog"]').within(() => {
      typeIntoField('Due date', '2026-12-31')
    })
    submitTaskDialog('Create')

    // Appears in Todo with the right title, priority, and a persisted due date.
    column('Todo').within(() => {
      card(taskTitle).should('be.visible')
    })
    column('In Progress').should('not.contain.text', taskTitle)
    column('Done').should('not.contain.text', taskTitle)
    card(taskTitle).within(() => {
      cy.contains('high')
      cy.contains('Unassigned')
      cy.contains('Due')
    })

    // Move to In Progress via the card's "Move to…" menu.
    card(taskTitle).within(() => {
      cy.contains('button', 'Move to…').click()
    })
    cy.get('[role="menu"]').contains('li', 'In Progress').click()
    column('In Progress').within(() => {
      card(taskTitle).should('be.visible')
    })
    column('Todo').should('not.contain.text', taskTitle)
    column('Done').should('not.contain.text', taskTitle)

    // Move to Done.
    card(taskTitle).within(() => {
      cy.contains('button', 'Move to…').click()
    })
    cy.get('[role="menu"]').contains('li', 'Done').click()
    column('Done').within(() => {
      card(taskTitle).should('be.visible')
    })
    column('Todo').should('not.contain.text', taskTitle)
    column('In Progress').should('not.contain.text', taskTitle)

    // Edit the task's title.
    card(taskTitle).within(() => {
      cy.contains('button', 'Edit').click()
    })
    cy.get('[role="dialog"]').should('be.visible').within(() => {
      typeIntoField('Title', updatedTitle)
    })
    submitTaskDialog('Save')
    card(updatedTitle).should('be.visible')
    cy.contains('.MuiCard-root', taskTitle).should('not.exist')

    // Delete the task (the signed-up user is the team's owner, so the
    // delete button is visible) and confirm it's gone from the board.
    card(updatedTitle).within(() => {
      cy.contains('button', 'Delete').click()
    })
    cy.contains('.MuiCard-root', updatedTitle).should('not.exist')
    column('Todo').should('contain.text', 'No tasks here.')
    column('In Progress').should('contain.text', 'No tasks here.')
    column('Done').should('contain.text', 'No tasks here.')
  })

  it('assigns a task to a team member and shows their name on the card', () => {
    const ownerName = uniqueName('Assign Owner')
    const ownerEmail = uniqueEmail('assign-owner')
    const memberName = uniqueName('Assign Member')
    const memberEmail = uniqueEmail('assign-member')
    const teamName = uniqueName('Assign Team')
    const taskTitle = uniqueName('Review the PR')

    // Seed a second real user directly against the API (cy.request runs in
    // Node, not the browser, so it isn't subject to the browser's CORS
    // policy) so their email exists to invite below.
    cy.request('POST', `${Cypress.env('apiUrl')}/auth/signup`, {
      name: memberName,
      email: memberEmail,
      password: TEST_PASSWORD,
    })

    signUp(ownerName, ownerEmail, TEST_PASSWORD)
    cy.location('pathname').should('eq', '/')

    createTeam(teamName)
    cy.location('pathname').should('match', /^\/teams\/[^/]+$/)

    // Add the second user to the team so they're a selectable assignee.
    cy.get('input[type="email"]').type(memberEmail)
    cy.contains('button', 'Add member').click()
    cy.contains('Member added.')
    cy.contains(memberName)

    openNewTaskDialog()
    cy.get('[role="dialog"]').within(() => {
      typeIntoField('Title', taskTitle)
    })
    chooseSelect('Assignee', memberName)
    submitTaskDialog('Create')

    card(taskTitle).within(() => {
      cy.contains(memberName)
    })
  })
})
