import axios, {AxiosInstance} from 'axios'
import autoBind from 'auto-bind'
import {SnippetOperations} from './snippetOperations'
import {ComplianceEnum, CreateSnippet, PaginatedSnippets, Snippet, UpdateSnippet} from './snippet'
import {PaginatedUsers} from './users.ts'
import {TestCase} from '../types/TestCase.ts'
import {TestCaseResult} from './queries.tsx'
import {FileType} from '../types/FileType.ts'
import {Rule} from '../types/Rule.ts'

// In dev, Vite proxies /api to snippet-service; in the Docker image, nginx does.
const BACKEND_URL: string = import.meta.env.VITE_BACKEND_URL ?? '/api'
// Who the UI acts as until Auth0 is enabled.
const USER_ID: string = import.meta.env.VITE_USER_ID ?? 'dev-user'
// The version new snippets are created with: the UI does not ask for one.
const PRINTSCRIPT_VERSION: string = import.meta.env.VITE_PRINTSCRIPT_VERSION ?? '1.1'

// The shapes snippet-service answers with.
type SnippetResponse = {
  id: string
  name: string
  description: string
  language: string
  version: string
  content: string
  ownerId: string
  status: 'PENDING' | 'COMPLIANT' | 'NOT_COMPLIANT'
}

type SnippetPage = {
  content: SnippetResponse[]
  page: number
  size: number
  total: number
}

type RuleResponse = {
  name: string
  isActive: boolean
  value: string | null
}

type TestCaseResponse = {
  id: string
  name: string
  inputs: string[]
  outputs: string[]
}

type TestRunResponse = {
  passed: boolean
}

// snippet-service has no endpoint for file types yet.
const FILE_TYPES: FileType[] = [{language: 'printscript', extension: 'ps'}]

const COMPLIANCE: Record<SnippetResponse['status'], ComplianceEnum> = {
  PENDING: 'pending',
  COMPLIANT: 'compliant',
  NOT_COMPLIANT: 'not-compliant',
}

const notYetSupported = (operation: string) =>
    Promise.reject(new Error(`snippet-service does not support ${operation} yet`))

/**
 * Talks to snippet-service. Until Auth0 is enabled, every request goes as the user in VITE_USER_ID,
 * through the X-User-Id header.
 */
export class SnippetServiceOperations implements SnippetOperations {
  private readonly client: AxiosInstance

  constructor(baseUrl: string = BACKEND_URL, userId: string = USER_ID) {
    this.client = axios.create({baseURL: baseUrl, headers: {'X-User-Id': userId}})
    autoBind(this)
  }

  async listSnippetDescriptors(page: number, pageSize: number, snippetName?: string): Promise<PaginatedSnippets> {
    const {data} = await this.client.get<SnippetPage>('/snippets', {
      params: {page, size: pageSize, name: snippetName || undefined}
    })
    return {page: data.page, page_size: data.size, count: data.total, snippets: data.content.map(toSnippet)}
  }

  async createSnippet(createSnippet: CreateSnippet): Promise<Snippet> {
    // The UI asks for neither a description nor a version.
    const {data} = await this.client.post<SnippetResponse>('/snippets', {
      name: createSnippet.name,
      description: createSnippet.name,
      language: createSnippet.language,
      version: PRINTSCRIPT_VERSION,
      content: createSnippet.content,
    })
    return toSnippet(data)
  }

  async getSnippetById(id: string): Promise<Snippet | undefined> {
    try {
      const {data} = await this.client.get<SnippetResponse>(`/snippets/${id}`)
      return toSnippet(data)
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 404) return undefined
      throw e
    }
  }

  async updateSnippetById(id: string, updateSnippet: UpdateSnippet): Promise<Snippet> {
    // The update replaces the whole snippet, and the UI only sends the code.
    const {data: current} = await this.client.get<SnippetResponse>(`/snippets/${id}`)
    const {data} = await this.client.put<SnippetResponse>(`/snippets/${id}`, {
      name: current.name,
      description: current.description,
      language: current.language,
      version: current.version,
      content: updateSnippet.content,
    })
    return toSnippet(data)
  }

  // There is no user list until Auth0: whatever is typed is taken as the id to share with.
  getUserFriends(name: string = '', page: number = 1, pageSize: number = 10): Promise<PaginatedUsers> {
    const users = name ? [{id: name, name}] : []
    return Promise.resolve({page, page_size: pageSize, count: users.length, users})
  }

  async shareSnippet(snippetId: string, userId: string): Promise<Snippet> {
    const {data} = await this.client.post<SnippetResponse>(`/snippets/${snippetId}/share`, {userId})
    return toSnippet(data)
  }

  getFormatRules(): Promise<Rule[]> {
    return this.getRules('formatting')
  }

  getLintingRules(): Promise<Rule[]> {
    return this.getRules('linting')
  }

  modifyFormatRule(newRules: Rule[]): Promise<Rule[]> {
    return this.putRules('formatting', newRules)
  }

  modifyLintingRule(newRules: Rule[]): Promise<Rule[]> {
    return this.putRules('linting', newRules)
  }

  formatSnippet(): Promise<string> {
    return notYetSupported('formatting code that is not saved')
  }

  async getTestCases(snippetId: string): Promise<TestCase[]> {
    const {data} = await this.client.get<TestCaseResponse[]>(`/snippets/${snippetId}/tests`)
    return data.map(toTestCase)
  }

  async postTestCase(snippetId: string, testCase: Partial<TestCase>): Promise<TestCase> {
    if (testCase.id) return notYetSupported('editing a test')
    const {data} = await this.client.post<TestCaseResponse>(`/snippets/${snippetId}/tests`, {
      name: testCase.name,
      inputs: testCase.input ?? [],
      outputs: testCase.output ?? [],
    })
    return toTestCase(data)
  }

  removeTestCase(): Promise<string> {
    return notYetSupported('removing a test')
  }

  async testSnippet(snippetId: string, testCase: Partial<TestCase>): Promise<TestCaseResult> {
    if (!testCase.id) return Promise.reject(new Error('Save the test before running it'))
    const {data} = await this.client.post<TestRunResponse>(`/snippets/${snippetId}/tests/${testCase.id}/run`)
    return data.passed ? 'success' : 'fail'
  }

  deleteSnippet(): Promise<string> {
    return notYetSupported('deleting a snippet')
  }

  getFileTypes(): Promise<FileType[]> {
    return Promise.resolve(FILE_TYPES)
  }

  private async getRules(type: 'formatting' | 'linting'): Promise<Rule[]> {
    const {data} = await this.client.get<RuleResponse[]>(`/rules/${type}`)
    return data.map(toRule)
  }

  private async putRules(type: 'formatting' | 'linting', rules: Rule[]): Promise<Rule[]> {
    const {data} = await this.client.put<RuleResponse[]>(`/rules/${type}`, rules.map(rule => ({
      name: rule.name,
      isActive: rule.isActive,
      value: rule.value == null ? null : String(rule.value),
    })))
    return data.map(toRule)
  }
}

const toSnippet = (snippet: SnippetResponse): Snippet => ({
  id: snippet.id,
  name: snippet.name,
  content: snippet.content,
  language: snippet.language,
  extension: FILE_TYPES.find(f => f.language === snippet.language)?.extension ?? '',
  compliance: COMPLIANCE[snippet.status],
  author: snippet.ownerId,
})

// snippet-service sends every value as text; the rules screens show a number field only for numbers.
const toRule = (rule: RuleResponse): Rule => ({
  id: rule.name,
  name: rule.name,
  isActive: rule.isActive,
  value: rule.value !== null && /^\d+$/.test(rule.value) ? Number(rule.value) : rule.value,
})

const toTestCase = (test: TestCaseResponse): TestCase => ({
  id: test.id,
  name: test.name,
  input: test.inputs,
  output: test.outputs,
})
