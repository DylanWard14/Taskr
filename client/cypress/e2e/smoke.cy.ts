describe('app shell', () => {
  it('loads the root route', () => {
    cy.visit('/')
    cy.contains(/sign in to see your teams/i)
  })
})
