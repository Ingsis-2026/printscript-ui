import {alpha, Chip, Skeleton, styled, TableRow, TableRowProps, Tooltip} from "@mui/material";
import {StyledTableCell} from "./SnippetTable.tsx";
import {COMPLIANCE_INFO, ComplianceEnum, Snippet} from "../../utils/snippet.ts";

const StyledTableRow = styled(TableRow)(({theme}) => ({
  backgroundColor: 'white',
  border: 0,
  height: '75px',
  cursor: 'pointer',
  '& td': {
    borderTop: '2px solid transparent',
    borderBottom: '2px solid transparent',
  },
  '& td:first-of-type': {
    borderLeft: '2px solid transparent',
    borderTopLeftRadius: theme.shape.borderRadius,
    borderBottomLeftRadius: theme.shape.borderRadius,
  },
  '& td:last-of-type': {
    borderRight: '2px solid transparent',
    borderTopRightRadius: theme.shape.borderRadius,
    borderBottomRightRadius: theme.shape.borderRadius,
  },
  '&:hover > td': {
    borderTop: `2px ${theme.palette.primary.light} solid`,
    borderBottom: `2px ${theme.palette.primary.light} solid`,
    backgroundColor: alpha(theme.palette.primary.light, 0.2)
  },
  '&:hover > td:first-of-type': {
    borderLeft: `2px ${theme.palette.primary.light} solid`,
  },
  '&:hover > td:last-of-type': {
    borderRight: `2px ${theme.palette.primary.light} solid`
  },
}));

// Whether the snippet follows its owner's lint rules, or why that is not known.
const ComplianceChip = ({compliance}: { compliance: ComplianceEnum }) => {
  const {label, description, color} = COMPLIANCE_INFO[compliance]
  return (
      <Tooltip title={description}>
        <Chip size="small" label={label} color={color} data-testid={"snippet-compliance"}/>
      </Tooltip>
  )
}

export const SnippetRow =({snippet, onClick, ...props}: { snippet: Snippet, onClick: () => void } & TableRowProps) => {
  return (
      <StyledTableRow onClick={onClick} sx={{backgroundColor: 'white', border: 0, height: '75px'}} {...props}>
        <StyledTableCell>{snippet.name}</StyledTableCell>
        <StyledTableCell>{snippet.language}</StyledTableCell>
        <StyledTableCell>{snippet.author}</StyledTableCell>
        <StyledTableCell><ComplianceChip compliance={snippet.compliance}/></StyledTableCell>
      </StyledTableRow>
  )
}

export const LoadingSnippetRow = () => {
  return (
      <TableRow sx={{height: '75px', padding: 0}}>
        <StyledTableCell colSpan={4} sx={{
          padding: 0
        }}>
          <Skeleton height={"75px"} width={"100%"} variant={"rectangular"}/>
        </StyledTableCell>
      </TableRow>
  )
}

