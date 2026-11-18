import {problem} from '../support/api'
import formattingRules from '../fixtures/formatting-rules.json'
import lintingRules from '../fixtures/linting-rules.json'

// US11: las reglas de formato del usuario. US14: sus reglas de lint. Dos reglas que se contradicen no se guardan.
describe('Rules', () => {
  beforeEach(() => {
    cy.visitHome()
    cy.contains('header button', 'Rules').click()
    cy.wait(['@getLintingRules', '@getFormattingRules'])
    cy.contains('h3', 'Rules').should('be.visible')
  })

  const rule = (name: string) => cy.get(`[data-testid="rule-${name}"]`)
  const checkbox = (name: string) => rule(name).find('input[type="checkbox"]')

  // Como las manda la UI: todas, con el valor como texto (null en las que no llevan).
  const asSent = (rules: typeof formattingRules, changes: Record<string, { isActive?: boolean, value?: string | null }>) =>
      rules.map(r => ({...r, ...changes[r.name]}))

  it('shows the formatting and linting rules, with their values', () => {
    cy.get('[data-testid="formatting-rules"] [data-testid^="rule-"]').should('have.length', formattingRules.length)
    cy.get('[data-testid="linting-rules"] [data-testid^="rule-"]').should('have.length', lintingRules.length)

    checkbox('if-brace-same-line').should('be.checked')
    checkbox('if-brace-below-line').should('not.be.checked')
    // Los valores numéricos van en un campo de número; los de texto, en uno de texto.
    rule('indent-inside-if').find('input[type="number"]').should('have.value', '4')
    rule('identifier_format').find('input[type="text"]').should('have.value', 'camel case')
  })

  it('saves the formatting rules that were turned on, off or changed', () => {
    cy.intercept({method: 'PUT', pathname: '/api/rules/formatting'}, req => req.reply({body: req.body})).as('save')

    checkbox('enforce-spacing-before-colon-in-declaration').check()
    checkbox('mandatory-line-break-after-statement').uncheck()
    // Borrar el campo lo deja en 0 (el número se guarda al tipear), así que se reemplaza seleccionándolo.
    rule('indent-inside-if').find('input[type="number"]').type('{selectall}2')
    cy.get('[data-testid="formatting-rules"]').contains('button', 'Save').click()

    cy.wait('@save').its('request.body').should('deep.equal', asSent(formattingRules, {
      'enforce-spacing-before-colon-in-declaration': {isActive: true},
      'mandatory-line-break-after-statement': {isActive: false},
      'indent-inside-if': {value: '2'},
    }))
    cy.contains('Formatting rules saved').should('be.visible')
  })

  it('does not save formatting rules that contradict each other, and keeps the change to fix it', () => {
    const detail = 'Estas reglas se contradicen y no pueden estar activas a la vez: if-brace-same-line, if-brace-below-line'
    cy.intercept({method: 'PUT', pathname: '/api/rules/formatting'}, problem(400, detail)).as('save')

    checkbox('if-brace-below-line').check()
    cy.get('[data-testid="formatting-rules"]').contains('button', 'Save').click()

    cy.wait('@save').its('request.body').should('deep.equal', asSent(formattingRules, {
      'if-brace-below-line': {isActive: true},
    }))
    cy.contains(`Could not save the formatting rules: ${detail}`).should('be.visible')
    checkbox('if-brace-same-line').should('be.checked')
    checkbox('if-brace-below-line').should('be.checked')
  })

  it('saves the linting rules', () => {
    cy.intercept({method: 'PUT', pathname: '/api/rules/linting'}, req => req.reply({body: req.body})).as('save')

    rule('identifier_format').find('input[type="text"]').clear().type('snake case')
    checkbox('mandatory-variable-or-literal-in-readInput').check()
    cy.get('[data-testid="linting-rules"]').contains('button', 'Save').click()

    cy.wait('@save').its('request.body').should('deep.equal', asSent(lintingRules, {
      'identifier_format': {value: 'snake case'},
      'mandatory-variable-or-literal-in-readInput': {isActive: true},
    }))
    cy.contains('Linting rules saved').should('be.visible')
  })

  it('says why a linting rule value was rejected', () => {
    const detail = 'kebab case no es un valor válido para la regla identifier_format'
    cy.intercept({method: 'PUT', pathname: '/api/rules/linting'}, problem(400, detail)).as('save')

    rule('identifier_format').find('input[type="text"]').clear().type('kebab case')
    cy.get('[data-testid="linting-rules"]').contains('button', 'Save').click()

    cy.wait('@save')
    cy.contains(`Could not save the linting rules: ${detail}`).should('be.visible')
    rule('identifier_format').find('input[type="text"]').should('have.value', 'kebab case')
  })
})
