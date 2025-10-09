import { build } from 'vite';
import { resolve } from 'node:path';

const rootDir = resolve(process.cwd(), 'engine/vite');
const repoRoot = resolve(rootDir, '..', '..');
const entriesDir = resolve(rootDir, 'entries');
const outputDir = resolve(repoRoot, 'assets');
const engineDir = resolve(repoRoot, 'engine');
const siteDir = resolve(repoRoot, 'site');
const vendorDir = resolve(repoRoot, 'vendor');

const targets = [
    { name: 'energine.vendor', entry: 'energine.vendor.entry.js' },
    { name: 'energine.extended.vendor', entry: 'energine.extended.vendor.entry.js' },
    { name: 'energine', entry: 'energine.entry.js' },
    { name: 'energine.extended', entry: 'energine.extended.entry.js' },
];

for (let index = 0; index < targets.length; index += 1) {
    const { name, entry } = targets[index];
    const isVendor = name === 'energine.vendor' || name === 'energine.extended.vendor';
    await build({
        root: rootDir,
        publicDir: false,
        base: './',
        resolve: {
            alias: {
                engine: engineDir,
                site: siteDir,
                vendor: vendorDir,
            },
        },
        build: {
            outDir: outputDir,
            emptyOutDir: index === 0,
            sourcemap: false,
            cssCodeSplit: false,
            rollupOptions: {
                preserveEntrySignatures: 'strict',
                input: resolve(entriesDir, entry),
                output: [
                    {
                        format: isVendor ? 'iife' : 'es',
                        strict: isVendor ? false : undefined,
                        name: isVendor ? 'EnergineVendor' : undefined,
                        inlineDynamicImports: true,
                        entryFileNames: `${name}.js`,
                        assetFileNames: (assetInfo) => {
                            const assetName = assetInfo.name ? assetInfo.name.toString() : '';
                            if (assetInfo.type === 'asset' && assetName.endsWith('.css')) {
                                return `${name}.css`;
                            }
                            return assetName || '[name][extname]';
                        },
                    },
                ],
                context: isVendor ? 'window' : undefined,
            },
        },
    });
}
