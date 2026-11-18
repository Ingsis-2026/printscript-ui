import {unstubbedRequests} from './commands'

beforeEach(() => {
  unstubbedRequests.length = 0
  cy.stubBackend()
})

afterEach(() => {
  // Un pedido sin stub es una llamada a la API que el test no esperaba.
  cy.then(() => expect(unstubbedRequests, 'pedidos a /api sin stub').to.deep.equal([]))
})
