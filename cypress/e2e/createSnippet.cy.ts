import {E2E_USER_ID, problem, SNIPPETS} from '../support/api'

// US1, US3: crear un snippet desde el editor o desde un archivo. Uno inválido no se guarda y se ve qué regla rompe.
describe('Create snippet', () => {
  const created = (body: Record<string, string>) => ({
    statusCode: 201,
    body: {id: '6f1c2a4e-0b1d-4c7e-9a10-0000000000aa', ...body, ownerId: E2E_USER_ID, status: 'PENDING'},
  })

  const openCreateModal = () => {
    cy.get('[data-testid="add-snippet-button"]').click()
    cy.contains('[role="menuitem"]', 'Create snippet').click()
    cy.contains('h2', 'Add Snippet').should('be.visible')
  }

  // El textarea del editor; cy.type toma las llaves como teclas especiales, así que el código no lleva.
  const typeCode = (code: string) =>
      cy.get('[data-testid="add-snippet-code-editor"] textarea').type(code, {delay: 0})

  beforeEach(() => cy.visitHome())

  it('creates a valid snippet written in the editor', () => {
    let saved: object | undefined
    cy.intercept({method: 'POST', pathname: '/api/snippets'}, req => {
      const response = created(req.body)
      saved = response.body
      req.reply(response)
    }).as('create')
    // Una vez creado, la lista lo incluye.
    cy.intercept({method: 'GET', pathname: '/api/snippets'}, req => {
      const content = saved ? [...SNIPPETS, saved] : SNIPPETS
      req.reply({body: {content, page: 0, size: 10, total: content.length}})
    })

    openCreateModal()
    cy.get('[data-testid="save-snippet-button"]').should('be.disabled')
    cy.get('#name').type('greeting')
    cy.get('#description').type('Saluda a Ana')
    cy.get('#version-select').click()
    cy.contains('[role="option"]', '1.0').click()
    typeCode('let name: string = "Ana";{enter}println(name);')
    cy.get('[data-testid="save-snippet-button"]').click()

    cy.wait('@create').then(({request, response}) => {
      expect(request.headers['content-type']).to.include('application/json')
      expect(request.body).to.deep.equal({
        name: 'greeting',
        description: 'Saluda a Ana',
        language: 'printscript',
        version: '1.0',
        content: 'let name: string = "Ana";\nprintln(name);',
      })
      expect(response?.statusCode).to.eq(201)
    })
    // Se cierra el modal y la lista se vuelve a pedir, ya con el nuevo.
    cy.contains('h2', 'Add Snippet').should('not.exist')
    cy.contains('[data-testid="snippet-row"]', 'greeting').should('contain', 'Pending')
  })

  it('uses the name as the description when none is given', () => {
    cy.intercept({method: 'POST', pathname: '/api/snippets'}, req => req.reply(created(req.body))).as('create')

    openCreateModal()
    cy.get('#name').type('no description')
    typeCode('println(1);')
    cy.get('[data-testid="save-snippet-button"]').click()

    cy.wait('@create').its('request.body').should('include', {description: 'no description', version: '1.1'})
  })

  it('does not save an invalid snippet and shows the rule it breaks, with line and column', () => {
    cy.intercept({method: 'POST', pathname: '/api/snippets'}, problem(422, 'El snippet no es válido', {
      instance: '/snippets',
      errors: [
        {rule: "Can't handle this sentence", line: 1, column: 1},
        {rule: "Carácter inválido encontrado: '@'", line: 2, column: 12},
      ],
    })).as('create')

    openCreateModal()
    cy.get('#name').type('broken')
    typeCode('let x = ;{enter}println(@);')
    cy.get('[data-testid="save-snippet-button"]').click()

    cy.wait('@create').its('response.statusCode').should('eq', 422)
    cy.get('[data-testid="code-errors"]')
        .should('contain', 'The snippet breaks the language rules')
        .and('contain', "Can't handle this sentence (line 1, column 1)")
        .and('contain', "Carácter inválido encontrado: '@' (line 2, column 12)")
    // No se guardó: el modal sigue abierto con lo que se escribió.
    cy.contains('h2', 'Add Snippet').should('be.visible')
    cy.get('#name').should('have.value', 'broken')
  })

  it('creates a snippet from a file', () => {
    cy.intercept({method: 'POST', pathname: '/api/snippets'}, req => req.reply(created(req.body))).as('create')

    cy.get('[data-testid="upload-file-input"]').selectFile('cypress/fixtures/greeting.ps', {force: true})
    // El modal se abre con el nombre del archivo y su contenido.
    cy.contains('h2', 'Add Snippet').should('be.visible')
    cy.get('#name').should('have.value', 'greeting')
    cy.get('[data-testid="save-snippet-button"]').click()

    cy.readFile('cypress/fixtures/greeting.ps').then(content => {
      cy.wait('@create').its('request.body').should('deep.include', {
        name: 'greeting',
        language: 'printscript',
        content,
      })
    })
  })
})
