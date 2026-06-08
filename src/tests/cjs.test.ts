import test from 'node:test';
import { equal } from 'node:assert/strict';

import fixImportsAndRequires from '../fixImports.ts';
import tsConfigPaths from './tsconfig.paths.ts';

const contents =
`const add = require('@sub/add');
add(1, 2)`;

test("CJS Import", async () => {
    const result = await fixImportsAndRequires({
        filePath: import.meta.filename,
        rootDir: import.meta.dirname,

        contents,
        writeToFile: false,

        inputExtension: '.ts',
        outputExtension: '.js',

        tsConfigPaths
    });

    equal(
        result.newContents.split('\n')[0],
        "const add = require('./sub/add.js');",
        "File wasn't properly resolved."
    );
});