import {useCallback, useEffect, useRef, useState} from "react";
import {useAuth0} from "@auth0/auth0-react";
import {CodeError, Execution, startExecution} from "../utils/execution.ts";

/** A line of the run console: what the code printed, what it asked for and what the user typed. */
export type ConsoleLine = {
  kind: 'output' | 'prompt' | 'input' | 'error' | 'info'
  text: string
}

export type ExecutionStatus = 'idle' | 'running' | 'waiting-input' | 'finished'

export type ExecutionState = {
  lines: ConsoleLine[]
  status: ExecutionStatus
  /** For a test run, whether it passed once it finished; null otherwise. */
  passed: boolean | null
  /** Runs the saved snippet, or one of its tests when testId is given. Stops any run in progress. */
  run: (testId?: string) => Promise<void>
  sendInput: (value: string) => void
  stop: () => void
}

const describe = (error: CodeError) =>
    error.line == null ? error.rule : `${error.rule} (line ${error.line}, column ${error.column})`

/** One run of a snippet at a time (US9 and US10), as a console of lines. */
export const useExecution = (snippetId: string): ExecutionState => {
  const {getAccessTokenSilently} = useAuth0()
  const [lines, setLines] = useState<ConsoleLine[]>([])
  const [status, setStatus] = useState<ExecutionStatus>('idle')
  const [passed, setPassed] = useState<boolean | null>(null)
  const execution = useRef<Execution | null>(null)

  const append = (line: ConsoleLine) => setLines(previous => [...previous, line])

  // Closing the snippet (or the test) stops its run: nobody is left to see it.
  useEffect(() => () => execution.current?.stop(), [])

  const run = useCallback(async (testId?: string) => {
    execution.current?.stop()
    execution.current = null
    setLines([])
    setPassed(null)
    setStatus('running')
    let token: string
    try {
      token = await getAccessTokenSilently()
    } catch {
      append({kind: 'error', text: 'Could not get an access token: log in again'})
      setStatus('finished')
      return
    }
    const finish = () => {
      execution.current = null
      setStatus('finished')
    }
    execution.current = startExecution(token, {snippetId, testId}, {
      onOutput: value => append({kind: 'output', text: value}),
      onInputRequest: message => {
        append({kind: 'prompt', text: message})
        setStatus('waiting-input')
      },
      onDone: (error, result) => {
        append(error ? {kind: 'error', text: describe(error)} : {kind: 'info', text: 'Finished'})
        setPassed(result)
        finish()
      },
      onFailure: message => {
        append({kind: 'error', text: message})
        finish()
      },
    })
  }, [getAccessTokenSilently, snippetId])

  const sendInput = useCallback((value: string) => {
    if (!execution.current) return
    append({kind: 'input', text: value})
    execution.current.sendInput(value)
    setStatus('running')
  }, [])

  const stop = useCallback(() => {
    if (!execution.current) return
    execution.current.stop()
    execution.current = null
    append({kind: 'info', text: 'Stopped'})
    setStatus('finished')
  }, [])

  return {lines, status, passed, run, sendInput, stop}
}
