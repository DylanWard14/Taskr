import { TEST_PASSWORD, uniqueEmail, uniqueName } from '../support/test-data'

// End-to-end coverage of media/image attachments — both task-level
// attachments (independent of comments) and comment-level attachments —
// against the real client + server + DB stack, including the server's
// on-disk upload and magic-byte validation (server/src/modules/media). Each
// test creates its own unique user/team/task via the UI so the spec is
// independent/re-runnable against a shared, non-empty dev database.
describe('media', () => {
  const fixtureImage = 'test-image.png'

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

  // Uploading and rendering an attachment is asynchronous in two ways: the
  // upload mutation itself, and then MediaThumbnail's own fetch of the
  // authenticated image bytes (useMediaImageUrl) which shows a spinner
  // ("Loading attachments…"/an indeterminate CircularProgress with no
  // accessible text) before the <img> appears. We assert on the eventual
  // <img> rather than the transient loading state, with Cypress's default
  // retry-until-timeout handling the wait. The file input is hidden (the
  // visible control is the "Add attachment" button), so `selectFile` needs
  // `force: true`. Callers are expected to already be within() the relevant
  // scope (dialog, or a specific comment's <li>) so this picks the right one
  // when there's more than one upload button on the page.
  function uploadViaInput() {
    cy.get('input[data-testid="media-file-input"]').selectFile(`cypress/fixtures/${fixtureImage}`, { force: true })
  }

  it('uploads, renders, and deletes a task-level attachment', () => {
    const ownerName = uniqueName('Media Owner')
    const ownerEmail = uniqueEmail('media-owner')
    const teamName = uniqueName('Media Team')
    const taskTitle = uniqueName('Design the mockup')

    signUp(ownerName, ownerEmail, TEST_PASSWORD)
    cy.location('pathname').should('eq', '/')

    createTeam(teamName)
    cy.location('pathname').should('match', /^\/teams\/[^/]+$/)

    createTask(taskTitle)
    card(taskTitle).should('be.visible')

    // Open the task's Attachments dialog (independent of Comments).
    card(taskTitle).within(() => {
      cy.contains('button', 'Attachments').click()
    })

    cy.get('[role="dialog"]').should('be.visible').within(() => {
      cy.contains('No attachments yet.')

      uploadViaInput()

      // Wait for the upload + the authenticated image fetch to resolve, then
      // assert the thumbnail actually rendered as an <img>.
      cy.contains('No attachments yet.').should('not.exist')
      cy.get('img[alt="Attachment"]', { timeout: 10000 }).should('be.visible')

      // Delete it (uploader is also the team owner, so Delete is visible).
      cy.contains('button', 'Delete').click()
      cy.get('img[alt="Attachment"]').should('not.exist')
      cy.contains('No attachments yet.')
    })

    // Reopen the dialog to confirm the deletion round-tripped through the
    // server, not just local UI state.
    cy.get('[role="dialog"]').contains('button', 'Close').click()
    cy.get('[role="dialog"]').should('not.exist')
    card(taskTitle).within(() => {
      cy.contains('button', 'Attachments').click()
    })
    cy.get('[role="dialog"]').should('be.visible').within(() => {
      cy.contains('No attachments yet.')
      cy.get('img[alt="Attachment"]').should('not.exist')
    })
  })

  it('uploads and renders an attachment on a comment', () => {
    const ownerName = uniqueName('Comment Media Owner')
    const ownerEmail = uniqueEmail('comment-media-owner')
    const teamName = uniqueName('Comment Media Team')
    const taskTitle = uniqueName('Review the mockup')
    const commentBody = `Here's a screenshot ${Date.now()}`

    signUp(ownerName, ownerEmail, TEST_PASSWORD)
    cy.location('pathname').should('eq', '/')

    createTeam(teamName)
    cy.location('pathname').should('match', /^\/teams\/[^/]+$/)

    createTask(taskTitle)
    card(taskTitle).should('be.visible')

    // Open Comments and post a comment first, so it has its own
    // MediaGallery/MediaUploadButton to attach to.
    card(taskTitle).within(() => {
      cy.contains('button', 'Comments').click()
    })
    cy.get('[role="dialog"]').should('be.visible').within(() => {
      cy.contains('label', 'Add a comment').closest('.MuiFormControl-root').find('textarea').first().type(commentBody)
      cy.contains('button', 'Post comment').click()
      cy.contains(commentBody).should('be.visible')

      // Use that comment's own "Add attachment" control (scoped to its <li>
      // so this doesn't ambiguously match another comment's uploader).
      cy.contains('li', commentBody).within(() => {
        cy.contains('No attachments yet.')
        uploadViaInput()
        cy.contains('No attachments yet.').should('not.exist')
        cy.get('img[alt="Attachment"]', { timeout: 10000 }).should('be.visible')
      })
    })
  })
})
