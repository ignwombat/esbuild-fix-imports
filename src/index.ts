import type { Plugin } from 'esbuild';
import type {
    FixImportsPluginOptions,
    LoaderResolver
} from './types.ts';

import fixImportsAndRequires from './fixImports.ts';
import { defaultFilter } from './const.ts';
import { extname } from 'node:path';
import { getTsconfig, type TsConfigJson } from 'get-tsconfig';

/**
 * EsBuild plugin which fixes issues related to import/require differences between ESM/CJS.
*/
export const FixImportsPlugin: (
    options?: FixImportsPluginOptions
) => Plugin = (options = {}) => {
    /**
     * EsBuild plugin which fixes issues related to import/require differences between ESM/CJS.
    */
    const plugin: Plugin =  {
        name: 'esbuild-fix-imports',
        setup(build) {
            let rootDir: string|undefined;
            let tsconfigPaths: Record<string, Array<string>>|undefined;

            let tsconfig: TsConfigJson|undefined;

            if (
                options.rootDir !== false &&
                options.tsconfigPaths !== false
            ) {
                tsconfig = getTsconfig()?.config;
            }

            if (options.rootDir !== false) {
                rootDir = typeof options.rootDir === 'string'
                    ? options.rootDir
                    : tsconfig?.compilerOptions?.rootDir;
            }

            if (options.tsconfigPaths !== false) {
                if (typeof options.tsconfigPaths === 'object')
                    tsconfigPaths = options.tsconfigPaths
                else {
                    const pathConfig = typeof options.tsconfigPaths === 'string'
                        ? getTsconfig(options.tsconfigPaths)?.config
                        : tsconfig;

                    if (pathConfig)
                        tsconfigPaths = pathConfig.compilerOptions?.paths;
                }
            }

            const pathCache = new Map<string, string>();

            const loader = options.loader;
            const resolveLoader: LoaderResolver = typeof loader === 'string'
                ? () => loader
                : typeof loader === 'function'
                    ? loader
                    : ext => (
                        ['.ts', '.mts', '.cts'].includes(ext)
                            ? 'ts'
                            : ext === '.tsx'
                                ? 'tsx'
                                : ['.js', '.cjs', '.mjs'].includes(ext)
                                    ? 'js'
                                    : ext === '.jsx'
                                        ? 'jsx'
                                        : 'text'
                    );

            build.onLoad(
                { filter: options.filter ?? defaultFilter },
                async args => {
                    const result = await fixImportsAndRequires({
                        filePath: args.path,
                        writeToFile: false,
                        inputFileExtension: options.inputFileExtension,
                        outputFileExtension: options.outputFileExtension,
                        tsconfigPaths,
                        rootDir,
                        pathCache
                    });
                    
                    return {
                        contents: result.newContents,
                        loader: resolveLoader(
                            extname(args.path),
                            args.path
                        )
                    };
                }
            );
        }
    };

    return plugin;
};