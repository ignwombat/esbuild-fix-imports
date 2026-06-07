import test from 'node:test';
import { match } from 'node:assert/strict';

import fixImportsAndRequires from '../fixImports.ts';
import tsConfigPaths from './tsconfig.paths.ts';

const contents =
`const add = require('@sub/add');
add(1, 2)`;

test("CJS import", async () => {
    const result = await fixImportsAndRequires({
        filePath: import.meta.filename,
        rootDir: import.meta.dirname,

        contents,
        writeToFile: false,

        inputExtension: '.ts',
        outputExtension: '.js',

        tsConfigPaths
    });

    match(
        result.newContents,
        /^const\s+add\s*=\s*require\(\s*'.\/sub\/add.js'\s*\);/,
        "File wasn't properly resolved"
    );
});