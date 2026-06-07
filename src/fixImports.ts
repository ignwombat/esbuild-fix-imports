// Path
import {
    dirname,
    extname,
    join,
    relative,
    resolve
} from 'node:path';

// Fs
import {
    readFile,
    stat,
    writeFile
} from 'node:fs/promises';

// Validation
import {
    equal,
    ok
} from 'node:assert/strict';

// Types
import type {
    ImportOptions,
    ImportFixResult,
    JsChunk
} from './types.ts';

// Const
import {
    importRegex,
    relativePathRegex,
    requireRegex,
    stringChars,
} from './const.ts';

/**
 * Simple stat wrapper with catch to undefined.
*/
const safeStat = (path: string) => stat(path)
    .catch(() => undefined);

/**
 * Cleanup relative path.
*/
const cleanRelPath = (path: string) => (
    !path.startsWith('.')
        ? `./` + path
        : path
).replaceAll('\\', '/');

/**
 * Automatically adds file extensions and index files to import/require statements.
 * Returns new contents and optionally writes to the file.
 */
export default async function fixImportsAndRequires(
    /**
     * Options for fixing imports in a single file
    */
    options: ImportOptions
): Promise<ImportFixResult> {
    // Validation
    equal(typeof options.filePath, 'string', "filePath must be a string");

    const tsconfigArgType = typeof options.tsconfigPaths;
    ok(
        tsconfigArgType === 'object' ||
        tsconfigArgType === 'undefined',
        "tsconfigPaths must be either an object or undefined"
    );

    const rootDirArgType = typeof options.rootDir;
    ok(
        rootDirArgType === 'string' ||
        rootDirArgType === 'undefined',
        "rootDir must be either a string, boolean or undefined"
    );

    // Paths
    const filePath = options.filePath;
    const parentDir = dirname(filePath);

    const rootDir = rootDirArgType === 'string'
        ? options.rootDir!
        : process.cwd();
    
    // File extension
    const fileExt = extname(filePath);
    const inputExt = options.inputFileExtension ?? fileExt;
    const outputExt = options.outputFileExtension ?? fileExt;

    // File contents (cast to string to prevent TypeScript errors)
    let fileContents = options.contents as string;

    // Optionally read the file.
    if (typeof fileContents !== 'string')
        await readFile(filePath, 'utf8')
            .then(contents => fileContents = contents)
            .catch(err => {
                throw new Error(
                    `Failed to read file ${filePath}`,
                    { cause: err }
                );
            });

    // Process chunks
    let lastChar = '';
    let lastStringQuote: string|null = null;

    let currentChunk: JsChunk = { content: '', stringQuote: null };
    const chunks: Array<JsChunk> = [];
    
    const pushChunk = () => {
        if (!currentChunk.content.length) {
            currentChunk.stringQuote = null;
            return;
        };

        chunks.push(currentChunk);

        const newChunk: JsChunk = { content: '', stringQuote: null };
        newChunk.prev = currentChunk;
        currentChunk.next = newChunk;

        currentChunk = newChunk;
    }

    const len = fileContents.length;
    for (let i = 0; i < len; i++) {
        const char = fileContents[i];

        if (!lastStringQuote) {
            // Update isString to true
            if (stringChars.includes(char)) {
                lastStringQuote = char;
                pushChunk();
                currentChunk.stringQuote = char;
            }

            currentChunk.content += char;
        } else if (
            char === lastStringQuote &&
            lastChar !== '\\'
        ) {
            // String has closed. Push the chunk.
            lastStringQuote = null;
            currentChunk.content += char;
            pushChunk();
        } else {
            // Otherwise, simply append the char
            currentChunk.content += char;
        }

        lastChar = char;
    }

    // Push any remaining chunk
    pushChunk();
    
    // Remove last linked chunk, as it is not part of the array
    if (chunks.length)
        chunks[chunks.length - 1].next = undefined;

    // Map chunks to create new contents
    const mappedChunks = await Promise.all(
        chunks.map(async chunk => {
            // Check for import/require statements
            // Current chunk must be a string
            // Previous chunk must NOT be a string
            // Previous chunk must match the import or require RegEx
            if (
                chunk.stringQuote !== null &&
                !chunk.content.slice(1).startsWith('node:') && // No need to resolve node imports
                chunk.prev?.stringQuote === null &&
                (
                    importRegex.test(chunk.prev.content) ||
                    requireRegex.test(chunk.prev.content)
                )
            ) {
                const quote = chunk.stringQuote;
                const quoteLen = quote.length;

                const importPath = chunk.content.slice(quoteLen, -quoteLen);
                const isRelative = relativePathRegex.test(importPath);

                // Absolute path of the resolved file
                // Cache is only appended to for non-relative imports
                let resolvedFilePath = options.pathCache?.get(importPath);

                if (
                    !resolvedFilePath &&
                    !isRelative &&
                    options.tsconfigPaths
                ) {
                    for (const k in options.tsconfigPaths) {
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

                            const paths: Array<string> = options.tsconfigPaths[k];
                            ok(paths instanceof Array, `tsconfigPaths['${k}'] must be an array of string`);

                            for (let j = 0; j < paths.length; j++) {
                                const path = paths[j];
                                equal(typeof path, 'string', `tsconfigPaths['${k}'][${j}] must be a string`);

                                // File path to try
                                const tryImportPath = path.replace(/\/\*$/, '/' + rest);
                                const joinedPath = resolve(rootDir, tryImportPath);

                                if (await safeStat(joinedPath)) {
                                    resolved = joinedPath;
                                    break;
                                } else if (await safeStat(joinedPath + inputExt)) {
                                    resolved = joinedPath + inputExt;
                                    break;
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
                const cleanImportStat = await safeStat(resultingPath);

                switch(true) {
                    // Folder / Clean file import
                    case cleanImportStat !== undefined: {
                        if (!cleanImportStat.isDirectory()) {
                            const rel = cleanRelPath(
                                relative(parentDir, resultingPath)
                            )
                                .slice(
                                    0,
                                    -extname(resultingPath).length
                                ) +
                                outputExt;

                            !isRelative && options.pathCache?.set(importPath, resultingPath);
                            return quote + rel + quote;
                        }

                        const indexFile = join(resultingPath, 'index' + inputExt);
                        if (await safeStat(indexFile)) {
                            const joined = join(resultingPath, 'index' + outputExt);
                            const rel = cleanRelPath(relative(
                                parentDir,
                                joined
                            ));

                            !isRelative && options.pathCache?.set(importPath, joined);
                            return quote + rel + quote;
                        }
                    }

                    // File import without extension
                    case (await safeStat(resultingPath + inputExt)) !== undefined: {
                        const rel = cleanRelPath(
                            relative(parentDir, resultingPath) +
                            outputExt
                        );

                        !isRelative && options.pathCache?.set(importPath, resultingPath + outputExt);
                        return quote + rel + quote;
                    }
                }
            }

            return chunk.content;
        })
    );

    const newContents = mappedChunks.join('');

    const result: ImportFixResult = {
        newContents,
        oldContents: fileContents,
        filePath,
        written: false
    };

    if (options.writeToFile === true) {
        await writeFile(filePath, newContents, 'utf8')
            .catch(err => {
                throw new Error(
                    `Failed to write to file ${filePath}`,
                    { cause: err }
                )
            });
        result.written = true;
    }

    return result;
}