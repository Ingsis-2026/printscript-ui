import {CreateSnippet, LintResult, PaginatedSnippets, Snippet, SnippetFilters, UpdateSnippet} from './snippet'
import {PaginatedUsers} from "./users.ts";
import {TestCase} from "../types/TestCase.ts";
import {TestCaseResult} from "./queries.tsx";
import {FileType} from "../types/FileType.ts";
import {Rule} from "../types/Rule.ts";

export interface SnippetOperations {
  listSnippetDescriptors(page: number,pageSize: number,sippetName?: string, filters?: SnippetFilters): Promise<PaginatedSnippets>

  createSnippet(createSnippet: CreateSnippet): Promise<Snippet>

  getSnippetById(id: string): Promise<Snippet | undefined>

  updateSnippetById(id: string, updateSnippet: UpdateSnippet): Promise<Snippet>

  getUserFriends(name?: string,page?: number,pageSize?: number): Promise<PaginatedUsers>

  shareSnippet(snippetId: string,userId: string): Promise<Snippet>

  getFormatRules(): Promise<Rule[]>

  getLintingRules(): Promise<Rule[]>

  getTestCases(snippetId: string): Promise<TestCase[]>

  formatSnippet(snippetId: string, content: string): Promise<string>

  postTestCase(snippetId: string, testCase: Partial<TestCase>): Promise<TestCase>

  removeTestCase(snippetId: string, id: string): Promise<string>

  deleteSnippet(id: string): Promise<string>

  testSnippet(snippetId: string, testCase: Partial<TestCase>): Promise<TestCaseResult>

  getFileTypes(): Promise<FileType[]>

  modifyFormatRule(newRules: Rule[]): Promise<Rule[]>

  modifyLintingRule(newRules: Rule[]): Promise<Rule[]>

  // US6: the lint rules of the snippet's owner that the snippet breaks.
  getLintErrors(snippetId: string): Promise<LintResult>

  // US13: the snippet as a file, as it was saved or formatted with its owner's rules.
  downloadSnippet(snippetId: string, formatted: boolean): Promise<SnippetFile>
}

export type SnippetFile = {
  filename: string
  content: string
}
