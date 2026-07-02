import test from 'node:test';
import { equal } from 'node:assert/strict';

import chunkFileContents from '../chunk.ts';

const message = "Hello!";
const sumDescription = " The sum is ";

const contents =
`const sum = 1 + 2;
const message = "${message}";
console.log(message + "${sumDescription}" + sum);`;

test("Chunking (basic)", () => {
    const result = chunkFileContents(contents);

    equal(
        result.map(c => c.content).join(''),
        contents,
        "Raw contents were not restructured."
    );

    equal(
        result.length,
        5,
        "Invalid chunk length."
    )

    equal(
        result[1].content,
        '"' + message + '"',
        `"${message}" was not chunked properly.`
    );

    equal(
        result[3].content,
        '"' + sumDescription + '"',
        `"${sumDescription}" was not chunked properly.`
    );
});