import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export const rootDir = __dirname;
export const entriesDir = resolve(rootDir, 'entries');
export const outputDir = resolve(rootDir, '../../assets');

export const buildTargets = [
    { name: 'energine.vendor', entry: 'energine.vendor.entry.js' },
    { name: 'energine', entry: 'energine.entry.js' },
    { name: 'energine.extended', entry: 'energine.extended.entry.js' },
];

export const createBuildConfig = (name, entry, emptyOutDir = false) =>
    defineConfig({
        root: rootDir,
        publicDir: false,
        build: {
            outDir: outputDir,
            emptyOutDir,
            sourcemap: false,
            cssCodeSplit: false,
            rollupOptions: {
                input: resolve(entriesDir, entry),
                output: {
                    inlineDynamicImports: true,
                    entryFileNames: `${name}.js`,
                    assetFileNames: `${name}.css`,
                },
            },
        },
    });

export default createBuildConfig(buildTargets[0].name, buildTargets[0].entry, true);
