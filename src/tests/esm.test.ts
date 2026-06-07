import test from 'node:test';
import { match } from 'node:assert/strict';

import fixImportsAndRequires from '../fixImports';

const contents =
`import add from '@sub/add';
add(1, 2)`;

test('ESM import', async () => {
    const result = await fixImportsAndRequires({
        filePath: import.meta.filename,
        rootDir: import.meta.dirname,

        contents,
        writeToFile: false,

        inputFileExtension: '.ts',
        outputFileExtension: '.js',

        tsconfigPaths: {
            '@sub/*': ['./sub/*']
        }
    });

    match(
        result.newContents,
        /^import\s+add\s+from\s+'.\/sub\/add.js';/,
        "File wasn't properly resolved"
    );
});