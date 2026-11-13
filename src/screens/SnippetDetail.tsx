import {useEffect, useRef, useState} from "react";
import Editor from "react-simple-code-editor";
import {highlight, languages} from "prismjs";
import "prismjs/components/prism-clike";
import "prismjs/components/prism-javascript";
import "prismjs/themes/prism-okaidia.css";
import {Alert, Box, CircularProgress, IconButton, Menu, MenuItem, Tooltip, Typography} from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';
import {
  useUpdateSnippetById
} from "../utils/queries.tsx";
import {
  useDownloadSnippet,
  useFormatSnippet,
  useGetLintErrors,
  useGetSnippetById,
  useShareSnippet
} from "../utils/queries.tsx";
import {Bòx} from "../components/snippet-table/SnippetBox.tsx";
import {BugReport, Delete, Download, Edit, PlayArrow, Save, Share, StopRounded, UploadFile} from "@mui/icons-material";
import {ShareSnippetModal} from "../components/snippet-detail/ShareSnippetModal.tsx";
import {TestSnippetModal} from "../components/snippet-test/TestSnippetModal.tsx";
import {Snippet} from "../utils/snippet.ts";
import {SnippetExecution} from "./SnippetExecution.tsx";
import ReadMoreIcon from '@mui/icons-material/ReadMore';
import {queryClient} from "../App.tsx";
import {DeleteConfirmationModal} from "../components/snippet-detail/DeleteConfirmationModal.tsx";
import {useExecution} from "../hooks/useExecution.ts";
import {useAuth0} from "@auth0/auth0-react";
import {useSnackbarContext} from "../contexts/snackbarContext.tsx";
import {RequestError, toRequestError} from "../utils/errors.ts";
import {CodeErrorsAlert} from "../components/common/CodeErrorsAlert.tsx";
import {EditSnippetDetailsModal} from "../components/snippet-detail/EditSnippetDetailsModal.tsx";

type SnippetDetailProps = {
  id: string;
  handleCloseModal: () => void;
}

// US13: downloads the snippet as it was saved, or formatted with its owner's rules.
const DownloadButton = ({snippet}: { snippet?: Snippet }) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const anchorRef = useRef<HTMLButtonElement>(null)
  const {mutateAsync: download, isLoading} = useDownloadSnippet(snippet?.id ?? "")
  const {createSnackbar} = useSnackbarContext()
  if (!snippet) return null;

  const handleDownload = async (formatted: boolean) => {
    setMenuOpen(false)
    try {
      const file = await download(formatted)
      const url = URL.createObjectURL(new Blob([file.content], {type: 'text/plain'}))
      const link = document.createElement('a')
      link.href = url
      link.download = file.filename
      link.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      createSnackbar('error', `Could not download the snippet: ${toRequestError(e).message}`)
    }
  }

  return (
    <>
      <Tooltip title={"Download"}>
        <IconButton ref={anchorRef} onClick={() => setMenuOpen(true)} disabled={isLoading}>
          {isLoading ? <CircularProgress size={24}/> : <Download/>}
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchorRef.current} open={menuOpen} onClose={() => setMenuOpen(false)}>
        <MenuItem onClick={() => handleDownload(false)}>Original</MenuItem>
        <MenuItem onClick={() => handleDownload(true)}>Formatted</MenuItem>
      </Menu>
    </>
  )
}

// US6: the lint rules of the snippet's owner that the saved code breaks, with their line and column.
const LintResultAlert = ({snippetId, unsaved}: { snippetId: string, unsaved: boolean }) => {
  const {data, isLoading, isError, error} = useGetLintErrors(snippetId)
  const saved = unsaved ? " (saved version)" : ""
  if (isLoading) return <Alert severity="info" icon={<CircularProgress size={20}/>}>Checking lint rules...</Alert>
  if (isError) return <Alert severity="error">Could not check the lint rules: {toRequestError(error).message}</Alert>
  if (!data) return null
  if (data.valid) return <Alert severity="success">Follows all the lint rules{saved}</Alert>
  const count = data.errors.length
  return <CodeErrorsAlert severity="warning" title={`Breaks ${count} lint rule${count === 1 ? "" : "s"}${saved}`} errors={data.errors}/>
}

export const SnippetDetail = (props: SnippetDetailProps) => {
  const {id, handleCloseModal} = props;
  const [code, setCode] = useState(
      ""
  );
  const [shareModalOppened, setShareModalOppened] = useState(false)
  const [deleteConfirmationModalOpen, setDeleteConfirmationModalOpen] = useState(false)
  const [testModalOpened, setTestModalOpened] = useState(false);
  const [editModalOpened, setEditModalOpened] = useState(false);
  const [saveError, setSaveError] = useState<RequestError | undefined>()
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {createSnackbar} = useSnackbarContext()
  const {user} = useAuth0()

  const {data: snippet, isLoading} = useGetSnippetById(id);
  const {mutate: shareSnippet, isLoading: loadingShare} = useShareSnippet()
  const {mutate: formatSnippet, isLoading: isFormatLoading, data: formatSnippetData} = useFormatSnippet(id)
  const {mutate: updateSnippet, isLoading: isUpdateSnippetLoading} = useUpdateSnippetById({
    onSuccess: () => {
      setSaveError(undefined)
      queryClient.invalidateQueries(['snippet', id])
      queryClient.invalidateQueries(['lintErrors', id])
      queryClient.invalidateQueries('listSnippets')
    }
  })
  const execution = useExecution(id)
  const running = execution.status === 'running' || execution.status === 'waiting-input'
  const unsaved = snippet !== undefined && snippet.content !== code
  // Only the owner changes, shares or deletes a snippet; who it was shared with only reads it (US7).
  const isOwner = snippet !== undefined && snippet.author === user?.sub

  useEffect(() => {
    if (snippet) {
      setCode(snippet.content);
    }
  }, [snippet]);

  useEffect(() => {
    if (formatSnippetData) {
      setCode(formatSnippetData)
    }
  }, [formatSnippetData])


  async function handleShareSnippet(userId: string) {
    shareSnippet({snippetId: id, userId}, {
      onSuccess: () => createSnackbar('success', 'Snippet shared'),
      onError: e => createSnackbar('error', `Could not share the snippet: ${toRequestError(e).message}`),
    })
  }

  // US2: what a file has replaces the code in the editor; it is saved like any other change.
  async function handleLoadFile(target: HTMLInputElement) {
    const file = target.files?.[0]
    target.value = ""
    if (!file) return
    try {
      setCode(await file.text())
      createSnackbar('info', `Loaded ${file.name}: save to keep it`)
    } catch (e) {
      createSnackbar('error', `Could not read ${file.name}`)
    }
  }

  function handleFormat() {
    formatSnippet(code, {
      onError: e => createSnackbar('error', `Could not format the snippet: ${toRequestError(e).message}`),
    })
  }

  function handleSave() {
    setSaveError(undefined)
    // US2, US4: an invalid snippet is not saved; the editor keeps the code and shows what it breaks.
    updateSnippet({id: id, updateSnippet: {content: code}}, {onError: e => setSaveError(toRequestError(e))})
  }

  return (
      <Box p={4} minWidth={'60vw'}>
        <Box width={'100%'} p={2} display={'flex'} justifyContent={'flex-end'}>
          <CloseIcon style={{cursor: "pointer"}} onClick={handleCloseModal}/>
        </Box>
        {
          isLoading ? (<>
            <Typography fontWeight={"bold"} mb={2} variant="h4">Loading...</Typography>
            <CircularProgress/>
          </>) : <>
            <Typography variant="h4" fontWeight={"bold"}>{snippet?.name ?? "Snippet"}</Typography>
            {snippet && (
                <>
                  <Typography variant="body1" color="text.secondary" mt={1} sx={{whiteSpace: 'pre-wrap'}}>
                    {snippet.description}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mt={1}>
                    {snippet.language} {snippet.version}{isOwner ? "" : " · shared with you"}
                  </Typography>
                </>
            )}
            <Box display="flex" flexDirection="row" gap="8px" padding="8px">
              {isOwner && (
                  <Tooltip title={"Share"}>
                    <IconButton onClick={() => setShareModalOppened(true)}>
                      <Share/>
                    </IconButton>
                  </Tooltip>
              )}
              {isOwner && (
                  <Tooltip title={"Edit details"}>
                    <IconButton onClick={() => setEditModalOpened(true)}>
                      <Edit/>
                    </IconButton>
                  </Tooltip>
              )}
              <Tooltip title={"Test"}>
                <IconButton onClick={() => setTestModalOpened(true)}>
                  <BugReport/>
                </IconButton>
              </Tooltip>
              <DownloadButton snippet={snippet}/>
              {/* US10: runs the saved snippet, asking for each input when the code needs it. */}
              <Tooltip title={running ? "Stop run" : unsaved ? "Run (the saved version)" : "Run"}>
                <IconButton onClick={() => running ? execution.stop() : execution.run()}>
                  {running ? <StopRounded/> : <PlayArrow/>}
                </IconButton>
              </Tooltip>
              <Tooltip title={"Format"}>
                <IconButton onClick={handleFormat} disabled={isFormatLoading}>
                  <ReadMoreIcon />
                </IconButton>
              </Tooltip>
              {isOwner && (
                  <Tooltip title={"Replace code from file"}>
                    <IconButton onClick={() => fileInputRef.current?.click()}>
                      <UploadFile/>
                    </IconButton>
                  </Tooltip>
              )}
              {isOwner && (
                  <Tooltip title={"Save changes"}>
                    <IconButton color={"primary"} onClick={handleSave} disabled={isUpdateSnippetLoading || snippet?.content === code} >
                      <Save />
                    </IconButton>
                  </Tooltip>
              )}
              {isOwner && (
                  <Tooltip title={"Delete"}>
                    <IconButton onClick={() => setDeleteConfirmationModalOpen(true)} >
                      <Delete color={"error"} />
                    </IconButton>
                  </Tooltip>
              )}
              <input hidden type={"file"} ref={fileInputRef} data-testid={"replace-file-input"}
                     onChange={e => handleLoadFile(e.target)}/>
            </Box>
            {saveError && (
                <Box mb={2}>
                  <CodeErrorsAlert
                      title={saveError.codeErrors.length ? "Not saved: the snippet breaks the language rules" : `Not saved: ${saveError.message}`}
                      errors={saveError.codeErrors}
                      onClose={() => setSaveError(undefined)}
                  />
                </Box>
            )}
            <Box display={"flex"} gap={2}>
              <Bòx flex={1} height={"fit-content"} overflow={"none"} minHeight={"500px"} bgcolor={'black'} color={'white'} code={code}>
                <Editor
                    value={code}
                    padding={10}
                    onValueChange={(code) => setCode(code)}
                    highlight={(code) => highlight(code, languages.js, "javascript")}
                    maxLength={1000}
                    style={{
                      minHeight: "500px",
                      fontFamily: "monospace",
                      fontSize: 17,
                    }}
                />
              </Bòx>
            </Box>
            <Box marginTop={2}>
              <LintResultAlert snippetId={id} unsaved={unsaved}/>
            </Box>
            <Box pt={1} flex={1} marginTop={2}>
              <Alert severity="info">Output</Alert>
              <SnippetExecution execution={execution}/>
            </Box>
          </>
        }
        <ShareSnippetModal loading={loadingShare || isLoading} open={shareModalOppened}
                           onClose={() => setShareModalOppened(false)}
                           onShare={handleShareSnippet}/>
        {snippet && <EditSnippetDetailsModal open={editModalOpened} onClose={() => setEditModalOpened(false)} snippet={snippet}/>}
        <TestSnippetModal snippetId={id} open={testModalOpened} onClose={() => setTestModalOpened(false)}/>
        <DeleteConfirmationModal open={deleteConfirmationModalOpen} onClose={() => setDeleteConfirmationModalOpen(false)} id={snippet?.id ?? ""} setCloseDetails={handleCloseModal} />
      </Box>
  );
}

