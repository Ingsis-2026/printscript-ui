import {HELLO, problem} from '../support/api'

// US7: compartir un snippet propio eligiendo al usuario de un listado que se filtra mientras se escribe.
describe('Share snippet', () => {
  const openShareModal = () => {
    cy.visitHome()
    cy.openSnippet(HELLO.name)
    // El buscador pide los usuarios apenas se abre el snippet, sin nada escrito.
    cy.wait('@searchUsers').its('request.query.name').should('eq', '')
    cy.get('[data-testid="share-button"]').click()
    cy.contains('h5', 'Share your snippet').should('be.visible')
  }

  const searchAndPick = (typed: string, option: string) => {
    cy.get('[data-testid="share-user-search"] input').type(typed)
    cy.wait('@searchUsers').its('request.query').should('include', {name: typed, page: '0', size: '5'})
    cy.contains('[role="option"]', option).click()
  }

  it('searches users as the name is typed and shares with the chosen one', () => {
    cy.intercept({method: 'POST', pathname: `/api/snippets/${HELLO.id}/share`}, {body: HELLO}).as('share')
    openShareModal()

    cy.get('[data-testid="share-confirm-button"]').should('be.disabled')
    searchAndPick('ana', 'Ana Gómez (ana@example.com)')
    cy.get('[data-testid="share-user-search"] input').should('have.value', 'Ana Gómez (ana@example.com)')
    cy.get('[data-testid="share-confirm-button"]').click()

    cy.wait('@share').its('request.body').should('deep.equal', {userId: 'auth0|ana'})
    cy.contains('Snippet shared').should('be.visible')
  })

  it('shows the users found, telling apart the ones with an email', () => {
    openShareModal()

    cy.get('[data-testid="share-user-search"] input').type('ana')
    cy.wait('@searchUsers')
    cy.get('[role="option"]').should(options => expect([...options].map(option => option.innerText))
        .to.deep.equal(['Ana Gómez (ana@example.com)', 'ana.lopez@example.com']))
  })

  it('says why it could not share', () => {
    cy.intercept({method: 'POST', pathname: `/api/snippets/${HELLO.id}/share`},
        problem(409, 'El usuario ya tiene acceso al snippet')).as('share')
    openShareModal()

    searchAndPick('ana', 'ana.lopez@example.com')
    cy.get('[data-testid="share-confirm-button"]').click()

    cy.wait('@share').its('request.body').should('deep.equal', {userId: 'google-oauth2|1234'})
    cy.contains('Could not share the snippet: El usuario ya tiene acceso al snippet').should('be.visible')
  })
})
