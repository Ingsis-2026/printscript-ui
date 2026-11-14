import {useEffect, useState} from "react";
import {TestCase} from "../../types/TestCase.ts";
import {Autocomplete, Box, Button, Chip, TextField, Typography} from "@mui/material";
import {BugReport, Delete, Save} from "@mui/icons-material";
import {useExecution} from "../../hooks/useExecution.ts";
import {SnippetExecution} from "../../screens/SnippetExecution.tsx";
import {queryClient} from "../../App.tsx";
import {TestStatusChip} from "./TestStatus.tsx";

type TabPanelProps = {
    snippetId: string;
    index: number;
    value: number;
    test?: TestCase;
    setTestCase: (test: Partial<TestCase>) => void;
    removeTestCase?: (testIndex: string) => void;
}

export const TabPanel = ({snippetId, value, index, test: initialTest, setTestCase, removeTestCase}: TabPanelProps) => {
    const [testData, setTestData] = useState<Partial<TestCase> | undefined>(initialTest);

    // US9: the test runs on the server with its saved inputs, and its output shows up as it is printed.
    const execution = useExecution(snippetId);
    const running = execution.status === 'running';

    // US16: snippet-service keeps the result of the run in the test, so the list shows it from now on.
    useEffect(() => {
        if (execution.status === 'finished') queryClient.invalidateQueries(['testCases', snippetId])
    }, [execution.status, snippetId]);

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`vertical-tabpanel-${index}`}
            aria-labelledby={`vertical-tab-${index}`}
            style={{width: '100%', height: '100%'}}
        >
            {value === index && (
                <Box sx={{px: 3}} display="flex" flexDirection="column" gap={2}>
                    {initialTest?.status && (
                        <Box display="flex" alignItems="center" gap={1}>
                            <Typography fontWeight="bold">Last result</Typography>
                            <TestStatusChip status={initialTest.status}/>
                        </Box>
                    )}
                    <Box display="flex" flexDirection="column" gap={1}>
                        <Typography fontWeight="bold">Name</Typography>
                        <TextField size="small" value={testData?.name}
                                   onChange={(e) => setTestData({...testData, name: e.target.value})}/>
                    </Box>
                    <Box display="flex" flexDirection="column" gap={1}>
                        <Typography fontWeight="bold">Input</Typography>
                        <Autocomplete
                            multiple
                            size="small"
                            id="tags-filled"
                            freeSolo
                            value={testData?.input ?? []}
                            onChange={(_, value) => setTestData({...testData, input: value})}
                            renderTags={(value: readonly string[], getTagProps) =>
                                value.map((option: string, index: number) => (
                                    <Chip variant="outlined" label={option} {...getTagProps({index})} />
                                ))
                            }
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                />
                            )}
                            options={[]}
                        />
                    </Box>
                    <Box display="flex" flexDirection="column" gap={1}>
                        <Typography fontWeight="bold">Output</Typography>
                        <Autocomplete
                            multiple
                            size="small"
                            id="tags-filled"
                            freeSolo
                            value={testData?.output ?? []}
                            onChange={(_, value) => setTestData({...testData, output: value})}
                            renderTags={(value: readonly string[], getTagProps) =>
                                value.map((option: string, index: number) => (
                                    <Chip variant="outlined" label={option} {...getTagProps({index})} />
                                ))
                            }
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                />
                            )}
                            options={[]}
                        />
                    </Box>
                    <Box display="flex" flexDirection="row" gap={1}>
                        {
                            (testData?.id && removeTestCase) && (
                            <Button onClick={() => removeTestCase(testData?.id ?? "")} variant={"outlined"} color={"error"}
                                    startIcon={<Delete/>}>
                                Remove
                            </Button>)
                        }
                        <Button disabled={!testData?.name} onClick={() => setTestCase(testData ?? {})} variant={"outlined"} startIcon={<Save/>}>
                            Save
                        </Button>
                        <Button onClick={() => testData?.id && execution.run(testData.id)} variant={"contained"}
                                startIcon={<BugReport/>} disableElevation disabled={!testData?.id || running}
                                title={testData?.id ? undefined : "Save the test before running it"}>
                            Test
                        </Button>
                        {execution.passed !== null && (execution.passed ? <Chip label="Pass" color="success"/> :
                            <Chip label="Fail" color="error"/>)}
                    </Box>
                    {execution.status !== 'idle' && <SnippetExecution execution={execution} minHeight={80}/>}
                </Box>
            )}
        </div>
    );
}