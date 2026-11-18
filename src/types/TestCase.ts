// US16: how the test did the last time it ran. Pending if it has not run since it or its snippet changed.
export type TestStatus = 'pending' | 'passed' | 'failed';

export type TestCase = {
    id: string;
    name: string;
    input?: string[];
    output?: string[];
    status?: TestStatus;
};
