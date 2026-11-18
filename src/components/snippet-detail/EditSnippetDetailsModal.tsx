import {Box, Button, CircularProgress, Input, InputLabel, MenuItem, Select, Typography} from "@mui/material";
import {useEffect, useState} from "react";
import {ModalWrapper} from "../common/ModalWrapper.tsx";
import {CodeErrorsAlert} from "../common/CodeErrorsAlert.tsx";
import {PRINTSCRIPT_VERSIONS, Snippet} from "../../utils/snippet.ts";
import {useUpdateSnippetById} from "../../utils/queries.tsx";
import {RequestError, toRequestError} from "../../utils/errors.ts";
import {queryClient} from "../../App.tsx";

/**
 * US2: the owner changes the snippet's name, description and version. The saved code goes along
 * unchanged, so what is in the editor and not saved yet stays unsaved. A new version can make the
 * code invalid: then nothing is saved and the rules it breaks are shown.
 */
export const EditSnippetDetailsModal = ({open, onClose, snippet, onSaved}: {
  open: boolean,
  onClose: () => void,
  snippet: Snippet,
  // Saving runs the snippet's tests again (US16).
  onSaved?: () => void,
}) => {
  const [name, setName] = useState(snippet.name)
  const [description, setDescription] = useState(snippet.description ?? "")
  const [version, setVersion] = useState(snippet.version ?? "")
  const [error, setError] = useState<RequestError | undefined>()
  const {mutateAsync: updateSnippet, isLoading} = useUpdateSnippetById({
    onSuccess: () => {
      queryClient.invalidateQueries(['snippet', snippet.id])
      queryClient.invalidateQueries(['lintErrors', snippet.id])
      queryClient.invalidateQueries('listSnippets')
      onSaved?.()
    }
  })

  useEffect(() => {
    if (open) {
      setName(snippet.name)
      setDescription(snippet.description ?? "")
      setVersion(snippet.version ?? "")
      setError(undefined)
    }
  }, [open, snippet]);

  const handleSave = async () => {
    setError(undefined)
    try {
      await updateSnippet({id: snippet.id, updateSnippet: {content: snippet.content, name, description, version}})
    } catch (e) {
      setError(toRequestError(e))
      return
    }
    onClose()
  }

  // A version the UI does not list (saved some other way) is still shown as the current one.
  const versions = PRINTSCRIPT_VERSIONS.includes(version) || !version ? PRINTSCRIPT_VERSIONS : [version, ...PRINTSCRIPT_VERSIONS]

  return (
      <ModalWrapper open={open} onClose={onClose}>
        <Typography variant={"h5"}>Edit details</Typography>
        <InputLabel htmlFor="edit-name">Name</InputLabel>
        <Input id="edit-name" value={name} onChange={e => setName(e.target.value)}/>
        <InputLabel htmlFor="edit-description">Description</InputLabel>
        <Input id="edit-description" value={description} multiline onChange={e => setDescription(e.target.value)}/>
        <InputLabel htmlFor="edit-version">Version</InputLabel>
        <Select id="edit-version" value={version} onChange={e => setVersion(e.target.value)} sx={{width: '50%'}}>
          {versions.map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
        </Select>
        {error && (
            <CodeErrorsAlert
                title={error.codeErrors.length ? `The code is not valid for version ${version}` : error.message}
                errors={error.codeErrors}
                onClose={() => setError(undefined)}
            />
        )}
        <Box display={"flex"} justifyContent={"flex-end"} gap={2}>
          <Button onClick={onClose} variant={"outlined"}>Cancel</Button>
          <Button onClick={handleSave} variant={"contained"} disabled={!name.trim() || !description.trim() || !version || isLoading}>
            {isLoading ? <CircularProgress size={24}/> : "Save"}
          </Button>
        </Box>
      </ModalWrapper>
  )
}
