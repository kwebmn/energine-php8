#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = fileURLToPath(new URL('.', import.meta.url));
const rootDir = resolve(scriptDir, '..', '..');

const checks = [
    {
        file: 'engine/vite/entries/energine.vendor.entry.js',
        forbidden: [
            /mdb-ui-kit/,
        ],
        message: 'Bootstrap vendor bundle must not import MDBootstrap packages.',
    },
    {
        file: 'engine/vite/entries/energine.mdvendor.entry.js',
        forbidden: [
            /vendor\/twbs\/bootstrap/,
            /bootstrap\.bundle/,
        ],
        message: 'MDB vendor bundle must not import Bootstrap files directly.',
    },
];

let hasError = false;

checks.forEach(({ file, forbidden, message }) => {
    const targetPath = resolve(rootDir, file);
    const source = readFileSync(targetPath, 'utf8');

    forbidden.forEach((pattern) => {
        if (pattern.test(source))
        {
            console.error(`[ui-guard] ${file}: ${message}`);
            console.error(`  Violating pattern: ${pattern}`);
            hasError = true;
        }
    });
});

if (hasError)
{
    process.exitCode = 1;
}
