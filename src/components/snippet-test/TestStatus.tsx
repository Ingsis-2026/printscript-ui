import {Alert, Box, Chip, CircularProgress, IconButton, Tooltip, Typography} from "@mui/material";
import {CheckCircle, Cancel, HourglassEmpty, Refresh} from "@mui/icons-material";
import {TestStatus} from "../../types/TestCase.ts";
import {useGetTestCases} from "../../utils/queries.tsx";
import {toRequestError} from "../../utils/errors.ts";

// US16: how a test did the last time it ran, which snippet-service does on its own whenever the snippet is saved.
const TEST_STATUS_INFO: Record<TestStatus, {
  label: string,
  description: string,
  color: 'success' | 'error' | 'default',
  Icon: typeof CheckCircle
}> = {
  passed: {label: 'Passed', description: 'Passed the last time it ran', color: 'success', Icon: CheckCircle},
  failed: {label: 'Failed', description: 'Failed the last time it ran', color: 'error', Icon: Cancel},
  pending: {
    label: 'Pending',
    description: 'Has not run since it or its snippet changed, or is running now',
    color: 'default',
    Icon: HourglassEmpty
  },
}

export const TestStatusIcon = ({status}: { status?: TestStatus }) => {
  if (!status) return null
  const {description, color, Icon} = TEST_STATUS_INFO[status]
  return <Icon fontSize="small" titleAccess={description} color={color === 'default' ? 'disabled' : color}/>
}

export const TestStatusChip = ({status}: { status?: TestStatus }) => {
  if (!status) return null
  const {label, description, color, Icon} = TEST_STATUS_INFO[status]
  return (
      <Tooltip title={description}>
        <Chip size="small" variant="outlined" label={label} color={color} icon={<Icon/>} data-testid={"test-status"}/>
      </Tooltip>
  )
}

/**
 * US16: how many of the snippet's tests passed the last time they ran. Right after saving, the
 * tests are asked for again while any is pending, until pollUntil.
 */
export const TestResultsSummary = ({snippetId, pollUntil}: { snippetId: string, pollUntil?: number }) => {
  const {data: tests, isError, error, isFetching, refetch} = useGetTestCases(snippetId, pollUntil)
  if (isError) return <Alert severity="error" sx={{mt: 2}}>Could not get the tests: {toRequestError(error).message}</Alert>
  if (!tests?.length) return null

  const count = (status: TestStatus) => tests.filter(test => test.status === status).length
  const passed = count('passed')
  const failed = count('failed')
  const pending = count('pending')
  const parts = [
    passed && `${passed} passed`,
    failed && `${failed} failed`,
    pending && `${pending} pending`,
  ].filter(Boolean)

  return (
      <Alert severity={failed ? "error" : pending ? "info" : "success"} data-testid={"test-results"} sx={{mt: 2}}
             action={
               <Tooltip title={"Refresh test results"}>
                 <span>
                   <IconButton size="small" onClick={() => refetch()} disabled={isFetching}>
                     {isFetching ? <CircularProgress size={18}/> : <Refresh fontSize="small"/>}
                   </IconButton>
                 </span>
               </Tooltip>
             }>
        <Box display="flex" flexDirection="column">
          <Typography variant="body2">Tests: {parts.join(" · ")}</Typography>
          {pending > 0 && (
              <Typography variant="caption" color="text.secondary">
                The tests run on their own after each save; pending ones may still be running.
              </Typography>
          )}
        </Box>
      </Alert>
  )
}
