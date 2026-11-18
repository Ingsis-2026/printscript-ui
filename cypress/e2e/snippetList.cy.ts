import {E2E_TOKEN, HELLO, SNIPPETS} from '../support/api'

// US5: la lista de snippets que el usuario puede ver, con sus filtros y su orden.
describe('Snippet list', () => {
  // Elige una opción de un Select de MUI, encontrándolo por su aria-label.
  const choose = (select: string, option: string) => {
    cy.get(`[role="combobox"][aria-label="${select}"]`).click()
    cy.contains('[role="option"]', option).click()
  }

  // Los textos de esos elementos, en orden; reintenta hasta que coincidan (la lista se actualiza sola).
  const shouldShowTexts = (selector: string, texts: string[]) =>
      cy.get(selector).should(elements => expect([...elements].map(e => e.innerText)).to.deep.equal(texts))

  const shouldShowRows = (names: string[]) => shouldShowTexts('[data-testid="snippet-row"] td:first-child', names)

  it('shows the snippets with their author and conformance, without going through Auth0', () => {
    // Si la app intentara loguearse contra Auth0, este intercept lo registraría.
    cy.intercept({hostname: /auth0\.com$/}, cy.spy().as('auth0'))

    cy.visit('/')
    cy.wait('@listSnippets').then(({request}) => {
      // Cada pedido lleva el token del usuario; snippet-service saca el usuario de ahí.
      expect(request.headers.authorization).to.eq(`Bearer ${E2E_TOKEN}`)
      expect(request.query).to.deep.equal({page: '0', size: '10', relation: 'ALL'})
    })

    cy.contains('E2E User').should('be.visible')
    cy.get('[data-testid="snippet-row"]').should('have.length', SNIPPETS.length)
    cy.contains('[data-testid="snippet-row"]', HELLO.name)
        .should('contain', 'printscript')
        .and('contain', HELLO.ownerId)
    // Los cinco estados de validez de snippet-service, incluido ERROR.
    shouldShowTexts('[data-testid="snippet-compliance"]', ['Compliant', 'Not compliant', 'Invalid', 'Pending', 'Could not check'])
    cy.get('@auth0').should('not.have.been.called')
  })

  it('filters by relation, language and conformance', () => {
    cy.visitHome()

    choose('relation', 'Mine')
    cy.shouldHaveListed({page: '0', size: '10', relation: 'OWNER'})
    cy.get('[data-testid="snippet-row"]').should('have.length', 4).and('not.contain', 'shared greeting')

    choose('relation', 'Shared with me')
    cy.shouldHaveListed({page: '0', size: '10', relation: 'SHARED'})
    shouldShowRows(['shared greeting'])

    choose('relation', 'All snippets')
    choose('language', 'printscript')
    cy.shouldHaveListed({page: '0', size: '10', relation: 'ALL', language: 'printscript'})

    choose('conformance', 'Not compliant')
    cy.shouldHaveListed({page: '0', size: '10', relation: 'ALL', language: 'printscript', status: 'NOT_COMPLIANT'})
    shouldShowRows(['my_sum'])

    choose('conformance', 'Could not check')
    cy.shouldHaveListed({page: '0', size: '10', relation: 'ALL', language: 'printscript', status: 'ERROR'})
    shouldShowRows(['stuck lint'])
  })

  it('searches by name', () => {
    cy.visitHome()

    cy.get('[data-testid="search-input"]').type('hello')
    cy.shouldHaveListed({page: '0', size: '10', relation: 'ALL', name: 'hello'})
    shouldShowRows([HELLO.name])
  })

  it('sorts by the clicked column, flipping the direction on a second click', () => {
    cy.visitHome()
    shouldShowRows(['hello world', 'my_sum', 'old syntax', 'shared greeting', 'stuck lint'])

    cy.contains('th [role="button"]', 'Name').click()
    cy.shouldHaveListed({page: '0', size: '10', relation: 'ALL', sort: 'name,desc'})
    shouldShowRows(['stuck lint', 'shared greeting', 'old syntax', 'my_sum', 'hello world'])

    cy.contains('th [role="button"]', 'Conformance').click()
    cy.shouldHaveListed({page: '0', size: '10', relation: 'ALL', sort: 'status,asc'})

    cy.contains('th [role="button"]', 'Conformance').click()
    cy.shouldHaveListed({page: '0', size: '10', relation: 'ALL', sort: 'status,desc'})

    cy.contains('th [role="button"]', 'Language').click()
    cy.shouldHaveListed({page: '0', size: '10', relation: 'ALL', sort: 'language,asc'})
  })

  it('pages through the results', () => {
    cy.intercept({method: 'GET', pathname: '/api/snippets', query: {page: '0'}}, {
      body: {content: SNIPPETS, page: 0, size: 10, total: 15},
    })
    cy.visit('/')
    cy.contains('1–10 of 15').should('be.visible')

    cy.intercept({method: 'GET', pathname: '/api/snippets', query: {page: '1'}}, {
      body: {content: [HELLO], page: 1, size: 10, total: 15},
    }).as('secondPage')
    cy.get('button[aria-label="Go to next page"]').click()
    cy.wait('@secondPage')
    cy.contains('11–15 of 15').should('be.visible')
    cy.get('[data-testid="snippet-row"]').should('have.length', 1)
  })
})
