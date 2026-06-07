// Types
import type { JsChunk } from './types.ts';

// Local
import { stringChars } from './const.ts';

/**
 * Splits the JS content into a structured array of logic and strings.
 * Useful for altering strings in a file, whilst leaving the rest untouched.
 * @param fileContents Contents of the JS file.
*/
export default function chunkFileContents(
    fileContents: string
): Array<JsChunk> {
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
            if (stringChars.includes(char)) {
                // Push current chunk, and make the new chunk a string
                pushChunk();

                currentChunk.stringQuote = char;
                lastStringQuote = char;
            }

            currentChunk.content += char;
        } else if (
            char === lastStringQuote &&
            lastChar !== '\\'
        ) {
            // String has closed. Push the chunk.
            currentChunk.content += char;
            pushChunk();
            
            lastStringQuote = null;
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

    return chunks;
}