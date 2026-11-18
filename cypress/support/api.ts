import snippetsPage from '../fixtures/snippets-page.json'

// Lo que devuelve snippet-service, para armar respuestas en los tests (ver SnippetController y compañía).

export type SnippetResponse = (typeof snippetsPage.content)[number]

export const SNIPPETS: SnippetResponse[] = snippetsPage.content

const byName = (name: string): SnippetResponse => {
  const snippet = SNIPPETS.find(s => s.name === name)
  if (!snippet) throw new Error(`No hay un snippet "${name}" en snippets-page.json`)
  return snippet
}

// Propio y que cumple las reglas de lint.
export const HELLO = byName('hello world')
// Propio y que no cumple las reglas de lint (ver lint-errors.json).
export const NOT_COMPLIANT = byName('my_sum')
// De otro usuario, compartido con el de los tests.
export const SHARED = byName('shared greeting')

// El usuario y el token de src/e2e/E2EAuthProvider.tsx.
export const E2E_USER_ID = 'auth0|e2e-user'
export const E2E_TOKEN = 'e2e-dummy-token'

/** Un error como lo responde Spring (ProblemDetail). Al de un snippet inválido se le agrega `errors`. */
export const problem = (status: number, detail: string, extra: Record<string, unknown> = {}) => ({
  statusCode: status,
  headers: {'content-type': 'application/problem+json'},
  body: {type: 'about:blank', title: TITLES[status] ?? 'Error', status, detail, ...extra},
})

const TITLES: Record<number, string> = {
  400: 'Bad Request',
  404: 'Not Found',
  409: 'Conflict',
  422: 'Unprocessable Content',
  501: 'Not Implemented',
}
