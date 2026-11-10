import {BACKEND_URL} from './snippetServiceOperations'

/** A rule of the language the code broke while running. The location is 1-based and may be missing. */
export type CodeError = {
  rule: string
  line: number | null
  column: number | null
}

// What snippet-service sends over /execution, in order: outputs and input requests while the code
// runs, then done or failure. It closes the socket after either.
type ServerMessage =
    | { type: 'output', value: string }
    | { type: 'input-request', message: string }
    | { type: 'done', error: CodeError | null, passed: boolean | null }
    | { type: 'failure', message: string }

export type ExecutionHandlers = {
  onOutput: (value: string) => void
  onInputRequest: (message: string) => void
  /** passed is null for an interactive run: there are no expected outputs to compare with. */
  onDone: (error: CodeError | null, passed: boolean | null) => void
  /** The run could not start or finish, for a reason that is not the code. */
  onFailure: (message: string) => void
}

export type Execution = {
  sendInput: (value: string) => void
  stop: () => void
}

/**
 * The WebSocket URL next to the API: wss://<this host>/api/execution behind nginx, or the same
 * path on VITE_BACKEND_URL when it points somewhere else.
 */
export const executionUrl = (backendUrl: string = BACKEND_URL, page: string = window.location.href): string => {
  const url = new URL(backendUrl, page)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  url.pathname = url.pathname.replace(/\/$/, '') + '/execution'
  return url.toString()
}

/**
 * Runs a snippet on snippet-service (US10), or one of its tests (US9), seeing each output as it is
 * printed. A browser can't send headers when it opens a WebSocket, so the access token goes in the
 * first message rather than in Authorization (and not in the URL, where it would end up in logs).
 */
export const startExecution = (
    token: string,
    target: { snippetId: string, testId?: string },
    handlers: ExecutionHandlers,
): Execution => {
  const socket = new WebSocket(executionUrl())
  let finished = false

  socket.onopen = () => socket.send(JSON.stringify({
    type: 'start',
    token,
    snippetId: target.snippetId,
    testId: target.testId ?? null,
  }))

  socket.onmessage = (event: MessageEvent<string>) => {
    if (finished) return
    const message = JSON.parse(event.data) as ServerMessage
    switch (message.type) {
      case 'output':
        handlers.onOutput(message.value)
        break
      case 'input-request':
        handlers.onInputRequest(message.message)
        break
      case 'done':
        finished = true
        handlers.onDone(message.error, message.passed)
        break
      case 'failure':
        finished = true
        handlers.onFailure(message.message)
        break
    }
  }

  // A close without done or failure: the server went away, or the socket never opened.
  socket.onclose = () => {
    if (finished) return
    finished = true
    handlers.onFailure('Lost the connection to the server')
  }

  return {
    sendInput: (value: string) => {
      if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({type: 'input', value}))
    },
    stop: () => {
      finished = true
      socket.close()
    },
  }
}
