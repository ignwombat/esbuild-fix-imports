import test from 'node:test';
import { equal, ok } from 'node:assert/strict';

import chunkFileContents from '../chunk.ts';

const message = "Hello!";
const sumDescription = " The sum is ";

const contents =
`const sum = 1 + 2;
const message = "${message}";
const sumDescription = "${sumDescription}";

const result = \`Test: \${message}\${sumDescription}\${\`definitely \${sum}\`}\`

console.log(message + "${sumDescription}" + sum);`;

test("Chunking (advanced)", () => {
    const result = chunkFileContents(contents);

    equal(
        result.map(c => c.content).join(''),
        contents,
        "Raw contents were not restructured."
    );
    
    equal(
        result[1].content,
        result[1].stringQuote + message + result[1].stringQuote,
        "Message was not chunked properly."
    );

    ok(
        result[6].kind === 'templateExpressionStart' && result[6].content === '${' &&
        result[7].kind === 'templateExpression' && result[7].content === 'message' &&
        result[8].kind === 'templateExpressionEnd' && result[8].content === '}',
        "Message template expression was not chunked properly."
    );

    ok(
        result[13].kind === 'template' && result[13].content === '`definitely ' &&
        result[14].kind === 'templateExpressionStart' && result[14].content === '${' &&
        result[15].kind === 'templateExpression' && result[15].content === 'sum' &&
        result[16].kind === 'templateExpressionEnd' && result[16].content === '}',
        "'Definitely' template string was not chunked properly."
    );
});