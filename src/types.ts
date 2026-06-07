import type { Loader } from 'esbuild';

/**
 * Plugin options for the fix imports plugin.
*/
export type FixImportsPluginOptions = Pick<
    ImportOptions,
    'inputFileExtension'|'outputFileExtension'
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
     * By default, this plugin will auto-import your project's tsconfig.
     * If needed, you may pass either the paths or tsconfig location.
     * Set to false to disable tsconfig paths resolution.
     * @example
     * ```ts
     * // tsconfig file location
     * {
     *     tsconfigPaths: 'tsconfig.paths.json'
     * }
     * ```
     * @example
     * ```ts
     * // explicit tsconfig paths
     * {
     *     tsconfigPaths: {
     *         '@utils/*': ['./src/utils/*'],
     *         '@/*': ['./src/*']
     *     }
     * }
     * ```
     * @example
     * ```ts
     * // no tsconfig paths
     * {
     *     tsconfigPaths: false
     * }
     * ```
    */
    tsconfigPaths?: Record<string, Array<string>>|string|boolean;

    /**
     * By default, this plugin will use the rootDir defined by the project's tsconfig
     * (or the current working directory.)
     * If needed, you may pass a separate rootDir location.
     * Set to false to always use the current working directory.
     * @example
     * ```ts
     * // set rootDir to src/app
     * {
     *     rootDir: './src/app'
     * }
     * ```
     * @example
     * ```ts
     * // force rootDir to the current working directory
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
export interface ImportOptions {
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
     *     tsconfigPaths: {
     *         '@utils/*': ['src/utils/*'],
     *         '@/*': ['src/*']
     *     }
     * }
     * ```
    */
    tsconfigPaths?: Record<string, Array<string>>;

    /**
     * File extension to check during imports. Defaults to the same extension as the input file.
    */
    inputFileExtension?: string|Record<string, string>;

    /**
     * File extension to use in the output import. Defaults to the same extension as the input file.
    */
    outputFileExtension?: string|Record<string, string>;

    /**
     * Optional cache to use when resolving imports from tsconfig paths.
     * Ideally pass an empty map here, as the function will add to it.
    */
    pathCache?: Map<string, string>
}

/**
 * Results of the applied fix
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