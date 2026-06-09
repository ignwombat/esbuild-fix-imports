// Path
import {
    dirname,
    extname,
    join,
    relative,
    resolve
} from 'node:path';

// Fs
import { existsSync, statSync } from 'node:fs';

// Validation
import { equal, ok } from 'node:assert/strict';

// Types
import type { PluginBuild } from 'esbuild';
import type {
    FixImportsPluginOptions,
    ResolveImportPathOptions,
    ResolveImportPathResult,
    TsConfigPaths
} from './types.ts';

// Local
import { relativePathRegex } from './const.ts';

/**
 * Simple stat wrapper with catch to undefined.
*/
const safeStat = (path: string) => {
    try {
        return statSync(path);
    } catch {}
};

/**
 * Cleanup relative path.
*/
const cleanRelPath = (path: string) => (
    !path.startsWith('.')
        ? `./` + path
        : path
).replaceAll('\\', '/');

/**
 * Resolves the import path for a file. Includes file extension.
*/
export default function resolveImportPath(
    options: ResolveImportPathOptions
): ResolveImportPathResult {
    // Validation
    equal(typeof options.filePath, 'string', "filePath must be a string");
    equal(typeof options.importPath, 'string', "importPath must be a string");

    options.tsConfigPaths !== undefined && equal(typeof options.tsConfigPaths, 'object', "tsConfigPaths must be an Object");
    options.rootDir !== undefined && equal(typeof options.rootDir, 'string', "rootDir must be a string");
    
    options.inputExtension !== undefined && equal(typeof options.inputExtension, 'string', "inputExtension must be a string");
    options.outputExtension !== undefined && equal(typeof options.outputExtension, 'string', "outputExtension must be a string");
    options.pathCache !== undefined && ok(options.pathCache instanceof Map, "pathCache must be a map");

    const filePath = options.filePath;
    const importPath = options.importPath;

    const parentDir = dirname(filePath);
    const isRelative = relativePathRegex.test(importPath);

    const rootDir = options.rootDir ?? process.cwd();

    const importerExt = extname(filePath);
    const inputExt = options.inputExtension ?? importerExt;
    const outputExt = options.outputExtension ?? importerExt;

    // Absolute path of the resolved file
    // Cache is only appended to for non-relative imports
    let resolvedFilePath = options.pathCache?.get(importPath);

    if (
        !resolvedFilePath &&
        !isRelative &&
        options.tsConfigPaths
    ) {
        for (const k in options.tsConfigPaths) {
            // If the path ends with /*, it is a dynamic path
            const isDynamicPath = k.endsWith('/*');
            // Remove /* from the path
            const prefixPath = isDynamicPath
                ? k.slice(0, -2)
                : k;

            // Import path must be identical or start with the prefix
            if (
                k === importPath ||
                (isDynamicPath && importPath.startsWith(prefixPath + '/'))
            ) {
                // Everything after the first /
                const rest = importPath.slice(prefixPath.length + 1);

                // Find the first resolving path
                let resolved: string|undefined;

                const paths: Array<string> = options.tsConfigPaths[k];
                ok(paths instanceof Array, `tsconfigPaths['${k}'] must be an array of string`);

                for (let j = 0; j < paths.length; j++) {
                    const path = paths[j];
                    equal(typeof path, 'string', `tsconfigPaths['${k}'][${j}] must be a string`);

                    // File path to try
                    const tryImportPath = path.replace(/\/\*$/, '/' + rest);
                    const joinedPath = resolve(rootDir, tryImportPath);

                    if (existsSync(joinedPath)) {
                        resolved = joinedPath;
                        break;
                    } else {
                        const secondStat = safeStat(joinedPath + inputExt);
                        if (secondStat?.isFile()) {
                            resolved = joinedPath + inputExt;
                            break;
                        }
                    }
                }

                if (resolved) {
                    resolvedFilePath = resolved;
                    break;
                }
            }
        }
    }

    // Default to relative import
    const resultingPath = resolvedFilePath ?? join(filePath, '..', importPath);
    const resultingExt = extname(resultingPath);
    const cleanImportStat = safeStat(resultingPath);

    const result: ResolveImportPathResult = {
        inputExtension: inputExt,
        outputExtension: outputExt,
        isIndexFile: false,
        resolvedInput: resultingPath,
        resolvedOutput: importPath,
        pathCache: options.pathCache
    };

    switch(true) {
        // Folder / Clean file import
        case cleanImportStat !== undefined: {
            if (cleanImportStat.isFile()) {
                const rel = cleanRelPath(
                    relative(parentDir, resultingPath)
                )
                    .slice(
                        0,
                        -resultingExt.length
                    ) +
                    outputExt;

                !isRelative && options.pathCache?.set(importPath, resultingPath);
                result.resolvedOutput = rel;
                break;
            }

            const indexFile = join(resultingPath, 'index' + inputExt);
            if (existsSync(indexFile)) {
                const joined = join(resultingPath, 'index' + outputExt);
                const rel = cleanRelPath(relative(
                    parentDir,
                    joined
                ));

                !isRelative && options.pathCache?.set(importPath, joined);

                result.resolvedInput = indexFile;
                result.resolvedOutput = rel;
                result.isIndexFile = true;
                break;
            }
        }

        // File import without extension
        case existsSync(resultingPath + inputExt): {
            const rel = cleanRelPath(
                relative(parentDir, resultingPath) +
                outputExt
            );

            !isRelative && options.pathCache?.set(importPath, resultingPath + outputExt);

            result.resolvedInput = resultingPath + inputExt;
            result.resolvedOutput = rel;
            break;
        }
    }

    return result;
}

/**
 * Enables tsconfig path resolution for the builder.
 * @param build EsBuild Builder.
 * @param pluginOptions Initial Plugin Options + Some explicit options.
 * @param pathCache Optional cache to use when resolving imports from tsconfig paths.
*/
export function enablePathResolver(
    build: PluginBuild,
    pluginOptions: Omit<
        FixImportsPluginOptions,
        'tsConfigPaths'|'rootDir'
    > & {
        tsConfigPaths: TsConfigPaths
        rootDir: string;
    },
    pathCache: Map<string, string> = new Map()
): void {
    // Create a regex for all TsConfig import paths
    const allImports = Object
        .keys(pluginOptions.tsConfigPaths)
        .map(k => k
            .replace(/\/\*$/, '\/.*')
            .replaceAll('|', '\\|')
        )
        .join(')|(');

    const filter = new RegExp(`^((${allImports}))$`);

    build.onResolve(
        { filter },
        async args => {
            const result = await resolveImportPath({
                filePath: args.importer,
                importPath: args.path,
                inputExtension: pluginOptions.inputExtension,
                outputExtension: pluginOptions.outputExtension,
                tsConfigPaths: pluginOptions.tsConfigPaths,
                rootDir: pluginOptions.rootDir,
                pathCache
            });

            return { path: result.resolvedInput };
        }
    );
}