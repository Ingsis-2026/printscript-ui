import {createContext, useContext} from 'react'

export type PaginationContextType = {
  page: number,
  page_size: number,
  count: number,
  handleGoToPage: (page: number) => void,
  handleChangePageSize: (page: number) => void,
  handleChangeCount: (page: number) => void,
}

export const defaultPagination = {
  page: 0,
  page_size: 10,
  count: 10
}

// @ts-expect-error: sin provider no hay valor; todos los componentes se montan adentro del provider, que siempre lo pasa
export const PaginationContext = createContext<PaginationContextType>(null)

export const usePaginationContext = (): PaginationContextType => useContext(PaginationContext)
