# EsBuild Fix Imports
import/require transformer for esbuild. Supports tsconfig paths.
Not to be confused with [EsBuild Fix Imports Plugin](https://github.com/aymericzip/esbuild-fix-imports-plugin).
These plugins differ in that this one properly walks through the code and only modifies import strings.
If the other plugin works in your use case, there is no need to install this one.

> While EsBuild can perfectly *resolve* your files, when bundling is disabled, it won't automatically change the import paths,
which can cause problems when you want to compile your project to both ESM and CommonJS.
This plugin aims to solve that issue.

**Tsconfig.json `baseUrl` is deprecated. This plugin only handles `rootDir`.**

## Installation
```sh
npm install --save-dev esbuild-fix-imports
```

## Usage
```ts
import { build } from 'esbuild';
import { FixImportsPlugin } from 'esbuild-fix-imports';

build({
    plugins: [
        // ...
        FixImportsPlugin({
            // ...
        })
    ]
})
```

## Options
**All options are optional**

### `filter` (RegExp)
RegEx filter to detect input files. By default detects all TypeScript files.
```ts
// All combinations of js, jsx, ts, tsx, etc.
{
    filter: /\.[cm]?[tj]sx?$/
}
```

### `tsconfigPaths` (string | boolean | Object)
By default, this plugin will auto-import your project's tsconfig. If needed, you may pass either the paths or tsconfig location.
Set to false to disable tsconfig paths resolution.
```ts
// tsconfig file location
{
    tsconfigPaths: 'tsconfig.paths.json'
}

// explicit tsconfig paths
{
    tsconfigPaths: {
        '@utils/*': ['./src/utils/*'],
        '@/*': ['./src/*']
    }
}

// no tsconfig paths
{
    tsconfigPaths: false
}
```

### `rootDir` (string | boolean)
By default, this plugin will use the rootDir defined by the project's tsconfig (or the current working directory.)
If needed, you may pass a separate rootDir location.
Set to false to always use the current working directory.
```ts
// set rootDir to src/app
{
    rootDir: './src/app'
}

// force rootDir to the current working directory
{
    rootDir: false
}
```

### `loader` (string | Function)
Optional custom resolver for what loader to use. Either pass a loader's name, or a function to resolve the loader.
```ts
// Basic TypeScript loader
{
    loader: 'ts'
}

// Dynamically choose between ts and tsx
{
    loader: ext => ext.endsWith('x')
        ? 'tsx'
        : 'ts'
}
```