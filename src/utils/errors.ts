import axios from 'axios'
import {CodeError} from './snippet.ts'

// What went wrong with a request, as the user should see it.
export type RequestError = {
  message: string
  // US1, US2: the language rules the code breaks, with their line and column.
  codeErrors: CodeError[]
}

// snippet-service answers errors as a ProblemDetail; an invalid snippet adds `errors`.
type ProblemDetail = {
  detail?: string
  title?: string
  errors?: CodeError[]
}

export const toRequestError = (error: unknown): RequestError => {
  if (axios.isAxiosError(error)) {
    const problem = error.response?.data as ProblemDetail | undefined
    if (problem && typeof problem === 'object') {
      return {
        message: problem.detail ?? problem.title ?? error.message,
        codeErrors: Array.isArray(problem.errors) ? problem.errors : [],
      }
    }
    return {message: error.message, codeErrors: []}
  }
  return {message: error instanceof Error ? error.message : String(error), codeErrors: []}
}

export const describeCodeError = ({rule, line, column}: CodeError): string =>
    line == null ? rule : `${rule} (line ${line}${column == null ? '' : `, column ${column}`})`
