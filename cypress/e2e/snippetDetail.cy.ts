import {HELLO, NOT_COMPLIANT, problem, SHARED} from '../support/api'

// US6: ver un snippet con las reglas de lint que rompe. US2, US4: editarlo y guardarlo. US13: descargarlo.
describe('Snippet detail', () => {
  const editor = () => cy.get('[data-testid="snippet-editor"] textarea')

  beforeEach(() => cy.visitHome())

  it('shows the snippet, its details and that it follows the lint rules', () => {
    cy.openSnippet(HELLO.name)
    cy.wait('@getLint')

    cy.contains(HELLO.description).should('be.visible')
    cy.contains('printscript 1.1').should('be.visible')
    editor().should('have.value', HELLO.content)
    cy.get('[data-testid="lint-result"]').should('contain', 'Follows all the lint rules')
    // Es del usuario: puede compartirlo, editarlo y guardarlo.
    cy.get('[data-testid="share-button"]').should('be.visible')
    cy.get('[data-testid="edit-details-button"]').should('be.visible')
    cy.get('[data-testid="save-button"]').should('be.disabled')
  })

  it('lists the lint rules the snippet breaks, with line and column', () => {
    cy.openSnippet(NOT_COMPLIANT.name)
    cy.wait('@getLint')

    cy.get('[data-testid="lint-result"]')
        .should('contain', 'Breaks 1 lint rule')
        .and('contain', 'The following identifier must be in camel case (line 1, column 5)')
  })

  it('shows a snippet shared with the user as read only', () => {
    cy.openSnippet(SHARED.name)

    cy.contains('shared with you').should('be.visible')
    cy.get('[data-testid="share-button"]').should('not.exist')
    cy.get('[data-testid="edit-details-button"]').should('not.exist')
    cy.get('[data-testid="save-button"]').should('not.exist')
    // Lo puede testear y descargar igual.
    cy.get('[data-testid="test-button"]').should('be.visible')
    cy.get('[data-testid="download-button"]').should('be.visible')
  })

  it('saves the edited code, sending the rest of the snippet as it is', () => {
    const newContent = `${HELLO.content}\nprintln("bye");`
    const updated = {...HELLO, content: newContent, status: 'PENDING'}
    cy.intercept({method: 'PUT', pathname: `/api/snippets/${HELLO.id}`}, {body: updated}).as('update')

    cy.openSnippet(HELLO.name)
    // Desde ahora snippet-service devuelve el código nuevo.
    cy.intercept({method: 'GET', pathname: `/api/snippets/${HELLO.id}`}, {body: updated}).as('getUpdated')
    editor().type('{moveToEnd}{enter}println("bye");', {delay: 0})
    cy.get('[data-testid="save-button"]').should('be.enabled').click()

    cy.wait('@update').its('request.body').should('deep.equal', {
      name: HELLO.name,
      description: HELLO.description,
      language: HELLO.language,
      version: HELLO.version,
      content: newContent,
    })
    // Después de guardar se vuelve a pedir el snippet: lo guardado es lo del editor, así que no queda nada por guardar.
    cy.wait('@getUpdated')
    editor().should('have.value', newContent)
    cy.get('[data-testid="save-button"]').should('be.disabled')
  })

  it('does not save invalid code and keeps it in the editor with the rule it breaks', () => {
    cy.intercept({method: 'PUT', pathname: `/api/snippets/${HELLO.id}`}, problem(422, 'El snippet no es válido', {
      errors: [{rule: 'Falta un paréntesis', line: 3, column: 9}],
    })).as('update')

    cy.openSnippet(HELLO.name)
    editor().type('{moveToEnd}{enter}println("bye";', {delay: 0})
    cy.get('[data-testid="save-button"]').click()

    cy.wait('@update').its('response.statusCode').should('eq', 422)
    cy.get('[data-testid="code-errors"]')
        .should('contain', 'Not saved: the snippet breaks the language rules')
        .and('contain', 'Falta un paréntesis (line 3, column 9)')
    editor().should('have.value', `${HELLO.content}\nprintln("bye";`)
  })

  it('edits the name, description and version without touching the code', () => {
    cy.intercept({method: 'PUT', pathname: `/api/snippets/${HELLO.id}`}, req => {
      req.reply({body: {...HELLO, ...req.body}})
    }).as('update')

    cy.openSnippet(HELLO.name)
    cy.get('[data-testid="edit-details-button"]').click()
    cy.get('#edit-name').clear().type('hello again')
    cy.get('#edit-description').clear().type('Saluda de nuevo')
    cy.get('#edit-version').click()
    cy.contains('[role="option"]', '1.0').click()
    cy.contains('h5', 'Edit details').parent().contains('button', 'Save').click()

    cy.wait('@update').its('request.body').should('deep.equal', {
      name: 'hello again',
      description: 'Saluda de nuevo',
      language: HELLO.language,
      version: '1.0',
      content: HELLO.content,
    })
    cy.contains('h5', 'Edit details').should('not.exist')
  })

  it('formats the code in the editor with the owner rules, without saving it', () => {
    const formatted = 'let message : string = "hello";\nprintln(message);\n'
    cy.intercept({method: 'POST', pathname: `/api/snippets/${HELLO.id}/format`}, {body: {content: formatted}}).as('format')

    cy.openSnippet(HELLO.name)
    cy.get('[data-testid="format-button"]').click()

    cy.wait('@format').its('request.body').should('deep.equal', {content: HELLO.content})
    editor().should('have.value', formatted)
    // Formatear no guarda: queda para guardar.
    cy.get('[data-testid="save-button"]').should('be.enabled')
  })

  describe('download (US13)', () => {
    const filename = `${HELLO.name}.ps`
    const formatted = 'let message : string = "hello";\nprintln(message);\n'
    // Como lo arma snippet-service con ContentDisposition: el nombre, que tiene un espacio, va codificado en UTF-8.
    const file = (content: string) => ({
      headers: {
        'content-type': 'text/plain;charset=UTF-8',
        'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
      body: content,
    })

    const download = (option: 'original' | 'formatted', formattedParam: string, content: string) => {
      cy.intercept({method: 'GET', pathname: `/api/snippets/${HELLO.id}/download`, query: {formatted: formattedParam}},
          file(content)).as('download')
      cy.task('clearDownloads')

      cy.openSnippet(HELLO.name)
      cy.get('[data-testid="download-button"]').click()
      cy.get(`[data-testid="download-${option}"]`).click()

      cy.wait('@download')
      cy.readFile(`${Cypress.config('downloadsFolder')}/${filename}`).should('eq', content)
    }

    it('downloads the snippet as it was saved', () => download('original', 'false', HELLO.content))

    it('downloads the snippet formatted with the owner rules', () => download('formatted', 'true', formatted))
  })
})
