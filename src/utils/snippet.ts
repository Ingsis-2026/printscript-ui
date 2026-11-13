import {Pagination} from "./pagination.ts";
import {FileType} from "../types/FileType.ts";

export type ComplianceEnum =
    'pending' |
    'failed' |
    'not-compliant' |
    'compliant'


export type CreateSnippet = {
  name: string;
  content: string;
  language: string;
  extension: string;
  // US1: the description and the language version are asked for when creating a snippet.
  description?: string;
  version?: string;
}

export type CreateSnippetWithLang = CreateSnippet & { language: string }

// US2: besides its code, the owner can change every field of the snippet. What is left out stays as it is.
export type UpdateSnippet = {
  content: string
  name?: string
  description?: string
  language?: string
  version?: string
}

export type Snippet = CreateSnippet & {
  id: string
} & SnippetStatus

type SnippetStatus = {
  compliance: ComplianceEnum;
  author: string;
}
export type PaginatedSnippets = Pagination & {
  snippets: Snippet[]
}

// US5: which snippets to list, by the user's relation to them.
export type SnippetRelation = 'ALL' | 'OWNER' | 'SHARED'

export type SnippetSortField = 'name' | 'language' | 'status'

// US5: the list is filtered by name, language and validity, and sorted by any of those fields.
export type SnippetFilters = {
  relation?: SnippetRelation
  language?: string
  compliance?: ComplianceEnum
  sort?: {field: SnippetSortField, direction: 'asc' | 'desc'}
}

// A rule the code breaks, where it does: what the parser or the linter reports (US1, US6).
export type CodeError = {
  rule: string
  line: number | null
  column: number | null
}

export type LintResult = {
  valid: boolean
  errors: CodeError[]
}

// The PrintScript versions language-service accepts.
export const PRINTSCRIPT_VERSIONS = ['1.0', '1.1']
// The version the create form starts with.
export const DEFAULT_PRINTSCRIPT_VERSION: string = import.meta.env.VITE_PRINTSCRIPT_VERSION ?? '1.1'

export const getFileLanguage = (fileTypes: FileType[], fileExt?: string) => {
  return fileExt && fileTypes?.find(x => x.extension == fileExt)
}
