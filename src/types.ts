import type { Loader } from 'esbuild';

/**
 * Type definition for Tsconfig Paths.
*/
export type TsConfigPaths = Record<string, Array<string>>;

/**
 * Plugin options for the fix imports plugin.
*/
export type FixImportsPluginOptions = Pick<
    ImportFixOptions,
    'inputExtension'|
    'outputExtension'|
    'ignoreDynamicImports'
> & {
    /**
     * RegEx filter to detect input files. By default detects all TypeScript files.
     * @example
     * ```ts
     * // All combinations of js, jsx, ts, tsx, etc.
     * {
     *     filter: /\.[cm]?[tj]sx?$/
     * }
     * ```
    */
    filter?: RegExp;

    /**
     * By default, this plugin will auto-import your project's TsConfig.
     * If needed, you may pass either the paths or TsConfig location.
     * Set to false to disable TsConfig paths resolution.
     * @example
     * ```ts
     * // TsConfig file location
     * {
     *     tsConfigPaths: 'tsconfig.paths.json'
     * }
     * ```
     * @example
     * ```ts
     * // Explicit TsConfig paths
     * {
     *     tsConfigPaths: {
     *         '@utils/*': ['./src/utils/*'],
     *         '@/*': ['./src/*']
     *     }
     * }
     * ```
     * @example
     * ```ts
     * // No TsConfig paths
     * {
     *     tsConfigPaths: false
     * }
     * ```
    */
    tsConfigPaths?: TsConfigPaths|string|boolean;

    /**
     * By default, this plugin will use the rootDir defined by the project's TsConfig
     * (or the current working directory.)
     * If needed, you may pass a separate rootDir location.
     * Set to false to always use the current working directory.
     * @example
     * ```ts
     * // Set rootDir to src/app
     * {
     *     rootDir: './src/app'
     * }
     * ```
     * @example
     * ```ts
     * // Force rootDir to the current working directory
     * {
     *     rootDir: false
     * }
     * ```
    */
    rootDir?: string|boolean;

    /**
     * Optional custom resolver for what loader to use.
     * Either pass a loader, or a function to resolve the loader.
     * @example
     * ```ts
     * // Basic TypeScript loader
     * {
     *     loader: 'ts'
     * }
     * ```
     * @example
     * ```ts
     * // Dynamically choose between ts and tsx
     * {
     *     loader: ext => ext.endsWith('x')
     *         ? 'tsx'
     *         : 'ts'
     * }
     * ```
    */
    loader?: Loader|LoaderResolver;
}

/**
 * Options for fixing imports and requires in a single file.
*/
export interface ImportFixOptions {
    /**
     * Path of the source file.
    */
    filePath: string;

    /**
     * Path of the root directory.
     * Will use the current working directory if this not passed.
    */
    rootDir?: string;

    /**
     * Optional contents of the source file.
     * Will read from `filePath` if this is not passed.
    */
    contents?: string;
    
    /**
     * Optional boolean to write to the source file.
     * @default false
    */
    writeToFile?: boolean;
    
    /**
     * Optional TsConfig Paths for resolving absolute imports.
     * @example
     * ```ts
     * {
     *     tsConfigPaths: {
     *         '@utils/*': ['src/utils/*'],
     *         '@/*': ['src/*']
     *     }
     * }
     * ```
    */
    tsConfigPaths?: TsConfigPaths;

    /**
     * File extension to use when searching for the import file. Defaults to the same extension as the input file.
     * @example
     * ```ts
     * // Use .ts when searching for files
     * {
     *     inputExtension: '.ts'
     * }
     * ```
    */
    inputExtension?: string|Record<string, string>;

    /**
     * File extension to use in the output import. Defaults to the same extension as the input file.
     * @example
     * ```ts
     * // Use .js in the output import
     * {
     *     outputExtension: '.js'
     * }
     * ```
    */
    outputExtension?: string|Record<string, string>;

    /**
     * Some projects rely on dynamic ESM imports being untouched.
     * Set this to true to ignore dynamic imports.
     * @example
     * ```ts
     * // Leave dynamic imports untouched
     * {
     *     ignoreDynamicImports: true
     * }
     * ```
    */
    ignoreDynamicImports?: boolean;

    /**
     * Optional cache to use when resolving imports from TsConfig paths.
     * Ideally pass an empty map here, as the function will add to it.
    */
    pathCache?: Map<string, string>
}

/**
 * Result of the applied import fix.
*/
export interface ImportFixResult {
    /**
     * New file contents.
    */
    newContents: string;

    /**
     * Old file contents.
    */
    oldContents: string;

    /**
     * Passed file path for convenience.
    */
    filePath: string;

    /**
     * True if the output file was written to.
    */
    written: boolean;
}

/**
 * Chunks used to distinguish strings from logic.
*/
export interface JsChunk {
    /**
     * Set to the opening/closing quote if the chunk is a string expression
    */
    stringQuote: string|null;

    /**
     * Content of the chunk
    */
    content: string;

    /**
     * Previous chunk
    */
    prev?: JsChunk;

    /**
     * Next chunk
    */
    next?: JsChunk;
}

/**
 * Resolver function for what loader to use.
*/
export type LoaderResolver = (
    /**
     * File extension, e.g '.ts'
    */
    ext: string,

    /**
     * Path of the file, e.g 'src/index.ts'
    */
    filePath: string
) => Loader;

/**
 * Options for resolving an import from a file.
*/
export type ResolveImportPathOptions = Pick<
    ImportFixOptions,
    'filePath'|
    'pathCache'|
    'inputExtension'|
    'outputExtension'|
    'rootDir'
> & {
    /**
     * Import Path the source file is targeting.
    */
    importPath: string;
    
    /**
     * Optional explicit TsConfig Paths.
    */
    tsConfigPaths?: TsConfigPaths;
}

/**
 * Result of the resolved import.
*/
export type ResolveImportPathResult = Required<Pick<
    ResolveImportPathOptions,
    'inputExtension'|
    'outputExtension'
>> & Pick<
    ResolveImportPathOptions,
    'pathCache'
> & {
    /**
     * Resolved path to the actual file. Includes file extension.
     * 
     * **Will return the original path if not resolved.**
    */
    resolvedInput: string;

    /**
     * Resolved import path to write to the output. Includes file extension.
     * 
     * **Will return the original import path if not resolved.**
    */
    resolvedOutput: string;

    /**
     * True if the original import was a folder, and an index file was found.
    */
    isIndexFile: boolean;
}