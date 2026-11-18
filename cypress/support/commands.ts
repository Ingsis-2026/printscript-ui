/// <reference types="cypress" />
import {E2E_USER_ID, NOT_COMPLIANT, problem, SnippetResponse, SNIPPETS} from './api'

// Los pedidos a /api que ningún test stubbeó. Se chequea después de cada test (ver e2e.ts). Los specs no importan
// este archivo: cada spec se bundlea aparte, así que tendría su propia copia de la lista y registraría los comandos de nuevo.
export const unstubbedRequests: string[] = []

/**
 * snippet-service no existe en los tests: todo /api se responde acá, con lo que devolvería para
 * cypress/fixtures. Un test cambia una respuesta definiendo otro intercept después de este, que gana.
 */
Cypress.Commands.add('stubBackend', () => {
  // Lo que no tenga stub responde 501 y hace fallar el test, en vez de irse al proxy de Vite (que no tiene nada atrás).
  cy.intercept({pathname: '/api/**'}, req => {
    unstubbedRequests.push(`${req.method} ${req.url}`)
    req.reply(problem(501, `Sin stub para ${req.method} ${req.url}`))
  })

  // US5: la lista paginada, como SnippetPage, filtrada y ordenada como lo haría snippet-service.
  cy.intercept({method: 'GET', pathname: '/api/snippets'}, req => req.reply({body: listSnippets(req.query)})).as('listSnippets')
  // US6: un snippet, por su id.
  cy.intercept({method: 'GET', pathname: '/api/snippets/*'}, req => {
    const snippet = SNIPPETS.find(s => req.url.endsWith(`/snippets/${s.id}`))
    req.reply(snippet ? {body: snippet} : problem(404, 'No existe el snippet'))
  }).as('getSnippet')
  // US6: las reglas de lint que rompe; solo my_sum rompe alguna.
  cy.intercept({method: 'GET', pathname: '/api/snippets/*/lint'}, req => {
    req.reply({fixture: req.url.includes(NOT_COMPLIANT.id) ? 'lint-errors.json' : 'lint-valid.json'})
  }).as('getLint')
  // US8, US16: los tests del snippet, cada uno con cómo le fue la última vez.
  cy.intercept({method: 'GET', pathname: '/api/snippets/*/tests'}, {fixture: 'tests.json'}).as('getTests')
  // US7: los usuarios con los que se puede compartir.
  cy.intercept({method: 'GET', pathname: '/api/users'}, {fixture: 'users-page.json'}).as('searchUsers')
  // US11, US14: las reglas del usuario.
  cy.intercept({method: 'GET', pathname: '/api/rules/formatting'}, {fixture: 'formatting-rules.json'}).as('getFormattingRules')
  cy.intercept({method: 'GET', pathname: '/api/rules/linting'}, {fixture: 'linting-rules.json'}).as('getLintingRules')
})

type Query = Record<string, string | number>

// Lo que respondería GET /snippets para los snippets de snippets-page.json.
const listSnippets = (query: Query) => {
  const {relation = 'ALL', name, language, status, sort = 'name,asc'} = query as Record<string, string | undefined>
  const [field, direction] = sort.split(',') as [keyof SnippetResponse, string]
  const content = SNIPPETS
      .filter(s => relation === 'ALL' || (relation === 'OWNER') === (s.ownerId === E2E_USER_ID))
      .filter(s => !name || s.name.toLowerCase().includes(name.toLowerCase()))
      .filter(s => !language || s.language === language)
      .filter(s => !status || s.status === status)
      .sort((a, b) => a[field].localeCompare(b[field]) * (direction === 'desc' ? -1 : 1))
  return {content, page: Number(query.page ?? 0), size: Number(query.size ?? 10), total: content.length}
}

/**
 * Espera a que la lista se haya pedido con exactamente estos parámetros. No sirve cy.wait: la lista se
 * pide más de una vez al cargar (StrictMode) y cada filtro dispara su pedido.
 */
Cypress.Commands.add('shouldHaveListed', (query: Query) => {
  cy.get<{ request: { query: Query } }[]>('@listSnippets.all').should(requests => {
    expect(requests.map(r => r.request.query), 'pedidos de la lista').to.deep.include(query)
  })
})

Cypress.Commands.add('visitHome', () => {
  cy.visit('/')
  cy.wait('@listSnippets')
  cy.get('[data-testid="snippet-row"]').should('have.length', SNIPPETS.length)
})

Cypress.Commands.add('openSnippet', (name: string) => {
  cy.contains('[data-testid="snippet-row"]', name).click()
  cy.wait('@getSnippet')
  cy.contains('h4', name).should('be.visible')
})
