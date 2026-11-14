import {
    Box,
    Button,
    capitalize,
    CircularProgress,
    Input,
    InputLabel,
    MenuItem,
    Select,
    SelectChangeEvent,
    Typography
} from "@mui/material";
import {highlight, languages} from "prismjs";
import {useEffect, useState} from "react";
import Editor from "react-simple-code-editor";

import "prismjs/components/prism-clike";
import "prismjs/components/prism-javascript";
import "prismjs/themes/prism-okaidia.css";
import {Save} from "@mui/icons-material";
import {
    CreateSnippet,
    CreateSnippetWithLang,
    DEFAULT_PRINTSCRIPT_VERSION,
    PRINTSCRIPT_VERSIONS
} from "../../utils/snippet.ts";
import {RequestError, toRequestError} from "../../utils/errors.ts";
import {CodeErrorsAlert} from "../common/CodeErrorsAlert.tsx";
import {ModalWrapper} from "../common/ModalWrapper.tsx";
import {useCreateSnippet, useGetFileTypes} from "../../utils/queries.tsx";
import {queryClient} from "../../App.tsx";

export const AddSnippetModal = ({open, onClose, defaultSnippet}: {
    open: boolean,
    onClose: () => void,
    defaultSnippet?: CreateSnippetWithLang
}) => {
    const [language, setLanguage] = useState(defaultSnippet?.language ?? "printscript");
    const [code, setCode] = useState(defaultSnippet?.content ?? "");
    const [snippetName, setSnippetName] = useState(defaultSnippet?.name ?? "")
    const [description, setDescription] = useState(defaultSnippet?.description ?? "")
    const [version, setVersion] = useState(defaultSnippet?.version ?? DEFAULT_PRINTSCRIPT_VERSION)
    const [error, setError] = useState<RequestError | undefined>()
    const {mutateAsync: createSnippet, isLoading: loadingSnippet} = useCreateSnippet({
        onSuccess: () => queryClient.invalidateQueries('listSnippets')
    })
    const {data: fileTypes} = useGetFileTypes();

    const handleCreateSnippet = async () => {
        const newSnippet: CreateSnippet = {
            name: snippetName,
            content: code,
            language: language,
            extension: fileTypes?.find((f) => f.language === language)?.extension ?? "prs",
            description,
            version,
        }
        setError(undefined)
        try {
            await createSnippet(newSnippet);
        } catch (e) {
            // US1: the snippet is not saved; the modal stays open with the rules the code breaks.
            setError(toRequestError(e))
            return
        }
        handleClose();
    }

    const handleClose = () => {
        setError(undefined)
        onClose()
    }

    useEffect(() => {
        if (defaultSnippet) {
            setCode(defaultSnippet?.content)
            setLanguage(defaultSnippet?.language)
            setSnippetName(defaultSnippet?.name)
            setDescription(defaultSnippet?.description ?? "")
            setVersion(defaultSnippet?.version ?? DEFAULT_PRINTSCRIPT_VERSION)
            setError(undefined)
        }
    }, [defaultSnippet]);

    return (
        <ModalWrapper open={open} onClose={handleClose}>
            {
                <Box sx={{display: 'flex', flexDirection: "row", justifyContent: "space-between"}}>
                    <Typography id="modal-modal-title" variant="h5" component="h2"
                                sx={{display: 'flex', alignItems: 'center'}}>
                        Add Snippet
                    </Typography>
                    <Button disabled={!snippetName || !code || !language || loadingSnippet} variant="contained"
                            disableRipple
                            sx={{boxShadow: 0}} onClick={handleCreateSnippet}>
                        <Box pr={1} display={"flex"} alignItems={"center"} justifyContent={"center"}>
                            {loadingSnippet ? <CircularProgress size={24}/> : <Save/>}
                        </Box>
                        Save Snippet
                    </Button>
                </Box>
            }
            <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
            }}>
                <InputLabel htmlFor="name">Name</InputLabel>
                <Input onChange={e => setSnippetName(e.target.value)} value={snippetName} id="name"
                       sx={{width: '50%'}}/>
            </Box>
            <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
            }}>
                <InputLabel htmlFor="description">Description</InputLabel>
                <Input onChange={e => setDescription(e.target.value)} value={description} id="description"
                       placeholder={"Optional: the name is used if left empty"} multiline sx={{width: '100%'}}/>
            </Box>
            <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
            }}>
                <InputLabel htmlFor="demo-simple-select">Language</InputLabel>
                <Select
                    labelId="demo-simple-select-label"
                    id="demo-simple-select"
                    value={language}
                    label="Age"
                    onChange={(e: SelectChangeEvent<string>) => setLanguage(e.target.value)}
                    sx={{width: '50%'}}
                >
                    {
                        fileTypes?.map(x => (
                            <MenuItem data-testid={`menu-option-${x.language}`} key={x.language}
                                      value={x.language}>{capitalize((x.language))}</MenuItem>
                        ))
                    }
                </Select>
            </Box>
            <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
            }}>
                <InputLabel htmlFor="version-select">Version</InputLabel>
                <Select
                    id="version-select"
                    value={version}
                    onChange={(e: SelectChangeEvent<string>) => setVersion(e.target.value)}
                    sx={{width: '50%'}}
                >
                    {PRINTSCRIPT_VERSIONS.map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                </Select>
            </Box>
            {error && (
                <CodeErrorsAlert
                    title={error.codeErrors.length ? "The snippet breaks the language rules" : error.message}
                    errors={error.codeErrors}
                    onClose={() => setError(undefined)}
                />
            )}
            <InputLabel>Code Snippet</InputLabel>
            <Box width={"100%"} sx={{
                backgroundColor: 'black', color: 'white', borderRadius: "8px",
            }}>
                <Editor
                    value={code}
                    padding={10}
                    data-testid={"add-snippet-code-editor"}
                    onValueChange={(code) => setCode(code)}
                    highlight={(code) => highlight(code, languages.js, 'javascript')}
                    style={{
                        borderRadius: "8px",
                        overflow: "auto",
                        minHeight: "300px",
                        maxHeight: "600px",
                        width: "100%",
                        fontFamily: "monospace",
                        fontSize: 17,
                    }}
                />
            </Box>
        </ModalWrapper>
    )
}

