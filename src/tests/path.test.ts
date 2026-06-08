import test from 'node:test';
import { equal } from 'node:assert/strict';

import resolveImportPath from '../resolveImportPath.ts';
import tsConfigPaths from './tsconfig.paths.ts';

test("Path Resolution", async () => {
    const result = await resolveImportPath({
        filePath: import.meta.filename,
        rootDir: import.meta.dirname,

        importPath: '@sub/add',
        inputExtension: '.ts',
        outputExtension: '.js',
        
        tsConfigPaths
    });

    equal(
        result.resolvedOutput,
        './sub/add.js',
        "File wasn't properly resolved."
    )
});