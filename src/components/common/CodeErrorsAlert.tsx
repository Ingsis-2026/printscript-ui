import {Alert, AlertColor, AlertTitle} from "@mui/material";
import {CodeError} from "../../utils/snippet.ts";
import {describeCodeError} from "../../utils/errors.ts";

// The rules some code breaks, each with its line and column (US1, US2, US6).
export const CodeErrorsAlert = ({title, errors, severity = 'error', onClose}: {
  title: string,
  errors: CodeError[],
  severity?: AlertColor,
  onClose?: () => void,
}) => (
    <Alert severity={severity} onClose={onClose} data-testid={"code-errors"}>
      <AlertTitle>{title}</AlertTitle>
      {errors.length > 0 && (
          <ul style={{margin: 0, paddingLeft: '20px'}}>
            {errors.map((error, index) => <li key={index}>{describeCodeError(error)}</li>)}
          </ul>
      )}
    </Alert>
)
