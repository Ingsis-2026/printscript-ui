import {
  Box,
  Button,
  IconButton,
  InputBase,
  Menu,
  MenuItem,
  Select,
  Stack,
  styled,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel
} from "@mui/material";
import {AddSnippetModal} from "./AddSnippetModal.tsx";
import {useRef, useState} from "react";
import {Add, Search} from "@mui/icons-material";
import {LoadingSnippetRow, SnippetRow} from "./SnippetRow.tsx";
import {
  ComplianceEnum,
  CreateSnippetWithLang,
  getFileLanguage,
  Snippet,
  SnippetFilters,
  SnippetRelation,
  SnippetSortField
} from "../../utils/snippet.ts";
import {usePaginationContext} from "../../contexts/paginationContext.tsx";
import {useSnackbarContext} from "../../contexts/snackbarContext.tsx";
import {useGetFileTypes} from "../../utils/queries.tsx";

type SnippetTableProps = {
  handleClickSnippet: (id: string) => void;
  snippets?: Snippet[];
  loading: boolean;
  handleSearchSnippet: (snippetName: string) => void;
  filters: SnippetFilters;
  onChangeFilters: (filters: SnippetFilters) => void;
}

const RELATIONS: {value: SnippetRelation, label: string}[] = [
  {value: 'ALL', label: 'All snippets'},
  {value: 'OWNER', label: 'Mine'},
  {value: 'SHARED', label: 'Shared with me'},
]

const COMPLIANCES: {value: ComplianceEnum, label: string}[] = [
  {value: 'compliant', label: 'Compliant'},
  {value: 'not-compliant', label: 'Not compliant'},
  {value: 'pending', label: 'Pending'},
  {value: 'failed', label: 'Invalid'},
]

// What the list is sorted by when nobody picked anything: snippet-service sorts by name.
const DEFAULT_SORT = {field: 'name', direction: 'asc'} as const

export const SnippetTable = (props: SnippetTableProps) => {
  const {snippets, handleClickSnippet, loading, handleSearchSnippet, filters, onChangeFilters} = props;
  const sort = filters.sort ?? DEFAULT_SORT
  const [addModalOpened, setAddModalOpened] = useState(false);
  const [popoverMenuOpened, setPopoverMenuOpened] = useState(false)
  const [snippet, setSnippet] = useState<CreateSnippetWithLang | undefined>()

  const popoverRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const {page, page_size: pageSize, count, handleChangePageSize, handleGoToPage} = usePaginationContext()
  const {createSnackbar} = useSnackbarContext()
  const {data: fileTypes} = useGetFileTypes();

  const handleLoadSnippet = async (target: EventTarget & HTMLInputElement) => {
    const files = target.files
    if (!files || !files.length) {
      createSnackbar('error',"Please select at leat one file")
      return
    }
    const file = files[0]
    const splitName = file.name.split(".")
    const fileType = getFileLanguage(fileTypes ?? [], splitName.at(-1))
    if (!fileType) {
      createSnackbar('error', `File type ${splitName.at(-1)} not supported`)
      return
    }
    file.text().then((text) => {
      setSnippet({
        name: splitName[0],
        content: text,
        language: fileType.language,
        extension: fileType.extension
      })
    }).catch(e => {
      console.error(e)
    }).finally(() => {
      setAddModalOpened(true)
      target.value = ""
    })
  }

  function handleClickMenu() {
    setPopoverMenuOpened(false)
  }

  // US5: clicking the column sorted by flips the direction; clicking another sorts by it, ascending.
  function handleSort(field: SnippetSortField) {
    const direction = sort.field === field && sort.direction === 'asc' ? 'desc' : 'asc'
    onChangeFilters({...filters, sort: {field, direction}})
  }

  const sortableHeader = (field: SnippetSortField, label: string) => (
      <StyledTableCell sx={{fontWeight: "bold"}} sortDirection={sort.field === field ? sort.direction : false}>
        <TableSortLabel active={sort.field === field} direction={sort.field === field ? sort.direction : 'asc'}
                        onClick={() => handleSort(field)}>
          {label}
        </TableSortLabel>
      </StyledTableCell>
  )

  return (
      <>
        <Box display="flex" flexDirection="row" justifyContent="space-between">
          <Box sx={{background: 'white', width: '30%', display: 'flex'}}>
            <InputBase
                sx={{ml: 1, flex: 1}}
                placeholder="Search by name"
                inputProps={{'aria-label': 'search'}}
                onChange={e => handleSearchSnippet(e.target.value)}
            />
            <IconButton type="button" sx={{p: '10px'}} aria-label="search">
              <Search/>
            </IconButton>
          </Box>
          <Button ref={popoverRef} variant="contained" disableRipple sx={{boxShadow: 0}}
                  onClick={() => setPopoverMenuOpened(true)}>
            <Add/>
            Add Snippet
          </Button>
        </Box>
        {/* US5: which snippets to see, by relation, language and validity. */}
        <Stack direction="row" gap={2} mt={2} flexWrap="wrap">
          <Select size="small" value={filters.relation ?? 'ALL'} sx={{background: 'white', minWidth: 170}}
                  inputProps={{'aria-label': 'relation', 'data-testid': 'relation-filter'}}
                  onChange={e => onChangeFilters({...filters, relation: e.target.value as SnippetRelation})}>
            {RELATIONS.map(r => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
          </Select>
          <Select size="small" value={filters.language ?? ''} displayEmpty sx={{background: 'white', minWidth: 170}}
                  inputProps={{'aria-label': 'language'}}
                  onChange={e => onChangeFilters({...filters, language: e.target.value || undefined})}>
            <MenuItem value="">Any language</MenuItem>
            {fileTypes?.map(f => <MenuItem key={f.language} value={f.language}>{f.language}</MenuItem>)}
          </Select>
          <Select size="small" value={filters.compliance ?? ''} displayEmpty sx={{background: 'white', minWidth: 170}}
                  inputProps={{'aria-label': 'conformance'}}
                  onChange={e => onChangeFilters({...filters, compliance: (e.target.value || undefined) as ComplianceEnum | undefined})}>
            <MenuItem value="">Any conformance</MenuItem>
            {COMPLIANCES.map(c => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
          </Select>
        </Stack>
        <Table size="medium" sx={{borderSpacing: "0 10px", borderCollapse: "separate"}}>
          <TableHead>
            <TableRow sx={{fontWeight: 'bold'}}>
              {sortableHeader('name', 'Name')}
              {sortableHeader('language', 'Language')}
              <StyledTableCell sx={{fontWeight: "bold"}}>Author</StyledTableCell>
              {sortableHeader('status', 'Conformance')}
            </TableRow>
          </TableHead>
          <TableBody>{
            loading ? (
                <>
                  {Array.from({length: 10}).map((_, index) => (
                      <LoadingSnippetRow key={index}/>
                  ))}
                </>
            ) : (
                <>
                  {
                      snippets && snippets.map((snippet) => (
                          <SnippetRow data-testid={"snippet-row"}
                                      onClick={() => handleClickSnippet(snippet.id)} key={snippet.id} snippet={snippet}/>
                      ))
                  }
                </>
            )
          }
          </TableBody>
          <TablePagination count={count} page={page} rowsPerPage={pageSize}
                           onPageChange={(_, page) => handleGoToPage(page)}
                           onRowsPerPageChange={e => handleChangePageSize(Number(e.target.value))}/>
        </Table>
        <AddSnippetModal defaultSnippet={snippet} open={addModalOpened}
                         onClose={() => setAddModalOpened(false)}/>
        <Menu anchorEl={popoverRef.current} open={popoverMenuOpened} onClick={handleClickMenu}>
          <MenuItem onClick={() => setAddModalOpened(true)}>Create snippet</MenuItem>
          <MenuItem onClick={() => inputRef?.current?.click()}>Load snippet from file</MenuItem>
        </Menu>
        <input hidden type={"file"} ref={inputRef} multiple={false} data-testid={"upload-file-input"}
               onChange={e => handleLoadSnippet(e?.target)}/>
      </>
  )
}


export const StyledTableCell = styled(TableCell)`
    border: 0;
    align-items: center;
`
