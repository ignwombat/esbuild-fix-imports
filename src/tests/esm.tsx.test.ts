import test from 'node:test';
import { equal } from 'node:assert/strict';

import fixImportsAndRequires from '../fixImports.ts';
import tsConfigPaths from './tsconfig.paths.ts';

const contents =
`import { isThisFileJsx } from '@sub/reactFile';
const randomTemplateString = \`Hello World \${1+1}\`;`;

test("ESM Import (tsx)", async () => {
    const result = await fixImportsAndRequires({
        filePath: import.meta.filename,
        rootDir: import.meta.dirname,

        contents,
        writeToFile: false,

        tsConfigPaths
    });

    equal(
        result.newContents.split('\n')[0],
        "import { isThisFileJsx } from './sub/reactFile.js';",
        "File wasn't properly resolved."
    );
});