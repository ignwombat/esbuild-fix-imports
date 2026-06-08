import test from 'node:test';
import { equal } from 'node:assert/strict';

import fixImportsAndRequires from '../fixImports.ts';
import tsConfigPaths from './tsconfig.paths.ts';

import type { FixImportOptions } from '../types.ts';

const importStatement = `const add = await import('@sub/add');`
const contents =
`(async () => {
    ${importStatement}
})();`;

const options: FixImportOptions = {
    filePath: import.meta.filename,
    rootDir: import.meta.dirname,

    contents,
    writeToFile: false,

    inputExtension: '.ts',
    outputExtension: '.js',

    tsConfigPaths
};

test("ESM Import (dynamic enabled)", async () => {
    const result = await fixImportsAndRequires(options);

    equal(
        result.newContents.split('\n')[1].trimStart(),
        importStatement.replace(/'[^']*'/, "'./sub/add.js'"),
        "File wasn't properly resolved."
    );
});

test("ESM Import (dynamic ignored)", async () => {
    const result = await fixImportsAndRequires({
        ...options,
        ignoreDynamicImports: true
    });

    equal(
        result.newContents.split('\n')[1].trimStart(),
        importStatement,
        "Dynamic import was not ignored."
    );
});