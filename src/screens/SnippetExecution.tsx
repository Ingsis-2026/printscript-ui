import {Box, OutlinedInput, Typography} from "@mui/material";
import {KeyboardEvent, useEffect, useRef, useState} from "react";
import {ConsoleLine, ExecutionState} from "../hooks/useExecution.ts";

const COLORS: Record<ConsoleLine['kind'], string> = {
  output: 'white',
  prompt: '#66d9ef',
  input: '#a6e22e',
  error: '#f92672',
  info: '#75715e',
}

type SnippetExecutionProps = {
  execution: ExecutionState
  minHeight?: number
}

/**
 * The run console (US9 and US10): each output appears as soon as the code prints it, and the input
 * box is enabled only while the code is waiting for one.
 */
export const SnippetExecution = ({execution, minHeight = 200}: SnippetExecutionProps) => {
  const {lines, status, sendInput} = execution
  const [input, setInput] = useState<string>("")
  const inputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const waiting = status === 'waiting-input'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({block: 'nearest'})
  }, [lines])

  useEffect(() => {
    if (waiting) inputRef.current?.focus()
  }, [waiting])

  const handleEnter = (event: KeyboardEvent) => {
    if (event.key === 'Enter' && waiting) {
      sendInput(input)
      setInput("")
    }
  }

  return (
      <>
        <Box minHeight={minHeight} maxHeight={400} overflow={"auto"} bgcolor={'black'} p={'10px'}
             fontFamily={"monospace"} fontSize={17} data-testid={"execution-console"}>
          {lines.length === 0 && status === 'idle' && (
              <Typography fontFamily={"monospace"} color={COLORS.info}>Press run to see the output here</Typography>
          )}
          {lines.map((line, index) => (
              <Box key={index} color={COLORS[line.kind]} whiteSpace={"pre-wrap"}>
                {line.kind === 'input' ? `> ${line.text}` : line.text}
              </Box>
          ))}
          {status === 'running' && <Box color={COLORS.info}>…</Box>}
          <div ref={bottomRef}/>
        </Box>
        <OutlinedInput inputRef={inputRef} onKeyDown={handleEnter} value={input} disabled={!waiting}
                       onChange={e => setInput(e.target.value)} fullWidth
                       placeholder={waiting ? "Type the input and press Enter" : "The code is not asking for input"}/>
      </>
  )
}
