import { join } from 'node:path';
import { rmSync, globSync } from 'node:fs';

import { build, type BuildOptions } from 'esbuild';
import { FixImportsPlugin } from './src/index.ts';

rmSync(
    join(process.cwd(), 'dist'),
    { recursive: true }
);

const entryPoints = globSync('src/**/*', {
    exclude: ['src/tests']
});

const esmOptions: BuildOptions = {
    entryPoints,
    outdir: './dist',

    format: 'esm',
    platform: 'node',
    minify: false,
    treeShaking: false,
    sourcemap: true
};

// ESM
build({
    ...esmOptions,
    plugins: [FixImportsPlugin({
        filter: /\.ts$/,
        inputFileExtension: '.ts',
        outputFileExtension: '.js',
        loader: 'ts'
    })]
}).catch(() => process.exit(1));

// CJS
build({
    ...esmOptions,
    format: 'cjs',
    outExtension: { '.js': '.cjs' },
    plugins: [FixImportsPlugin({
        filter: /\.ts$/,
        inputFileExtension: '.ts',
        outputFileExtension: '.cjs',
        loader: 'ts'
    })]
}).catch(() => process.exit(1));