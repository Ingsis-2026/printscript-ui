declare namespace Cypress {
  interface Chainable {
    /** Stubbea todo /api con cypress/fixtures (ver support/commands.ts). Corre antes de cada test. */
    stubBackend(): Chainable<void>

    /** Espera a que la lista de snippets se haya pedido con exactamente estos parámetros. */
    shouldHaveListed(query: Record<string, string | number>): Chainable<void>

    /** Abre la lista de snippets y espera a que se muestre. */
    visitHome(): Chainable<void>

    /** Abre el detalle del snippet con ese nombre desde la lista. */
    openSnippet(name: string): Chainable<void>
  }
}
