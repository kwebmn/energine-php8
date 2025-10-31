import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export const rootDir = __dirname;
export const repoRoot = resolve(rootDir, '..', '..');
export const entriesDir = resolve(rootDir, 'entries');
export const outputDir = resolve(repoRoot, 'assets');
export const engineDir = resolve(repoRoot, 'engine');
export const siteDir = resolve(repoRoot, 'site');
export const vendorDir = resolve(repoRoot, 'vendor');

const uiFramework = (process.env.UI_FRAMEWORK || '').toLowerCase();
const isBootstrapOnly = uiFramework === 'bootstrap5';
const isMdOnly = uiFramework === 'mdbootstrap';

export const allBuildTargets = [
    { name: 'energine.vendor', entry: 'energine.vendor.entry.js', ui: 'bootstrap5' },
    { name: 'energine.mdvendor', entry: 'energine.mdvendor.entry.js', ui: 'mdbootstrap' },
    { name: 'energine.extended.vendor', entry: 'energine.extended.vendor.entry.js' },
    { name: 'energine.ckeditor', entry: 'energine.ckeditor.entry.js' },
    { name: 'energine', entry: 'energine.entry.js' },
    { name: 'energine.extended', entry: 'energine.extended.entry.js' },
];

export const buildTargets = allBuildTargets.filter((target) => {
    if (!target.ui) {
        return true;
    }
    if (isBootstrapOnly) {
        return target.ui === 'bootstrap5';
    }
    if (isMdOnly) {
        return target.ui === 'mdbootstrap';
    }
    return true;
});

export const createBuildConfig = (name, entry, emptyOutDir = false, target = 'es2022') =>
    defineConfig({
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
            emptyOutDir,
            sourcemap: false,
            cssCodeSplit: false,
            target,
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

const [firstTarget] = buildTargets;
export default createBuildConfig(
    firstTarget?.name ?? allBuildTargets[0].name,
    firstTarget?.entry ?? allBuildTargets[0].entry,
    true,
);
