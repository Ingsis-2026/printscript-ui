import {HELLO} from '../support/api'
import tests from '../fixtures/tests.json'

// US8: los tests de un snippet. US16: cómo le fue a cada uno la última vez que corrió (snippet-service los corre solo).
describe('Snippet tests', () => {
  beforeEach(() => {
    cy.visitHome()
    cy.openSnippet(HELLO.name)
    cy.wait('@getTests')
  })

  // El panel del test elegido; los demás están en el DOM pero ocultos.
  const panel = () => cy.get('[role="tabpanel"]:not([hidden])')

  it('summarizes how the tests did the last time they ran', () => {
    cy.get('[data-testid="test-results"]')
        .should('contain', 'Tests: 1 passed · 1 failed · 1 pending')
        .and('contain', 'The tests run on their own after each save; pending ones may still be running.')
  })

  it('lists the tests, each with its status', () => {
    cy.get('[data-testid="test-button"]').click()
    cy.contains('h5', 'Test snippet').should('be.visible')

    cy.get('[role="tab"]').should('have.length', tests.length)
    // El ícono de cada pestaña dice cómo le fue (titleAccess).
    cy.contains('[role="tab"]', 'prints hello').find('title').should('have.text', 'Passed the last time it ran')
    cy.contains('[role="tab"]', 'prints bye').find('title').should('have.text', 'Failed the last time it ran')
    cy.contains('[role="tab"]', 'reads a name').find('title')
        .should('have.text', 'Has not run since it or its snippet changed, or is running now')

    // El primero se abre solo, con su resultado, sus inputs y sus outputs.
    panel().find('[data-testid="test-status"]').should('have.text', 'Passed')
    panel().find('[data-testid="test-name-input"]').should('have.value', 'prints hello')
    panel().find('[data-testid="test-outputs"]').should('contain', 'hello')

    cy.contains('[role="tab"]', 'reads a name').click()
    panel().find('[data-testid="test-status"]').should('have.text', 'Pending')
    panel().find('[data-testid="test-inputs"]').should('contain', 'Ana')
    panel().find('[data-testid="test-outputs"]').should('contain', 'Hola Ana')
  })

  it('creates a test with its inputs and expected outputs', () => {
    const created = {
      id: 'a1d7e0c2-5b3f-4e8a-8c21-0000000000aa',
      name: 'greets Juan',
      inputs: ['Juan'],
      outputs: ['Hola Juan'],
      status: 'PENDING',
    }
    cy.intercept({method: 'POST', pathname: `/api/snippets/${HELLO.id}/tests`}, {statusCode: 201, body: created}).as('create')

    cy.get('[data-testid="test-button"]').click()
    cy.get('[data-testid="add-test-button"]').click()
    panel().find('[data-testid="save-test-button"]').should('be.disabled')
    panel().find('[data-testid="test-name-input"]').type('greets Juan')
    panel().find('[data-testid="test-inputs"] input').type('Juan{enter}')
    panel().find('[data-testid="test-outputs"] input').type('Hola Juan{enter}')
    // Ya con los tests nuevos, la lista que se vuelve a pedir lo incluye.
    cy.intercept({method: 'GET', pathname: `/api/snippets/${HELLO.id}/tests`}, {body: [...tests, created]}).as('getTests')
    panel().find('[data-testid="save-test-button"]').click()

    cy.wait('@create').its('request.body').should('deep.equal', {
      name: 'greets Juan',
      inputs: ['Juan'],
      outputs: ['Hola Juan'],
    })
    cy.wait('@getTests')
    cy.get('[role="tab"]').should('have.length', tests.length + 1)
    cy.contains('[role="tab"]', 'greets Juan').should('be.visible')
  })

  it('removes a test', () => {
    const [first, ...rest] = tests
    cy.intercept({method: 'DELETE', pathname: `/api/snippets/${HELLO.id}/tests/${first.id}`}, {statusCode: 204}).as('remove')

    cy.get('[data-testid="test-button"]').click()
    cy.intercept({method: 'GET', pathname: `/api/snippets/${HELLO.id}/tests`}, {body: rest}).as('getTests')
    panel().contains('button', 'Remove').click()

    cy.wait('@remove')
    cy.wait('@getTests')
    cy.contains('[role="tab"]', first.name).should('not.exist')
  })
})
