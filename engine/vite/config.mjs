import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const rootDir = fileURLToPath(new URL('.', import.meta.url));
export const repoRoot = resolve(rootDir, '..', '..');
export const entriesDir = resolve(rootDir, 'entries');
export const outputDir = resolve(repoRoot, 'assets');
export const engineDir = resolve(repoRoot, 'engine');
export const siteDir = resolve(repoRoot, 'site');
export const vendorDir = resolve(repoRoot, 'vendor');

const SUPPORTED_UI = new Set(['bootstrap5', 'mdbootstrap']);

const normalizeUiFramework = (value) => {
    if (!value)
    {
        return null;
    }

    const normalized = String(value).trim().toLowerCase();

    return SUPPORTED_UI.has(normalized) ? normalized : null;
};

const uiVendorTargets = [
    { name: 'energine.vendor', entry: 'energine.vendor.entry.js', framework: 'bootstrap5' },
    { name: 'energine.mdvendor', entry: 'energine.mdvendor.entry.js', framework: 'mdbootstrap' },
];

const sharedTargets = [
    { name: 'energine.extended.vendor', entry: 'energine.extended.vendor.entry.js' },
    { name: 'energine.ckeditor', entry: 'energine.ckeditor.entry.js' },
    { name: 'energine', entry: 'energine.entry.js' },
    { name: 'energine.extended', entry: 'energine.extended.entry.js' },
];

export const resolveBuildTargets = (uiFramework = normalizeUiFramework(process.env.UI_FRAMEWORK)) => {
    const vendorTargets = uiFramework
        ? uiVendorTargets.filter((target) => target.framework === uiFramework)
        : uiVendorTargets;

    return [...vendorTargets, ...sharedTargets];
};

export const buildTargets = resolveBuildTargets();

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

export default createBuildConfig(buildTargets[0].name, buildTargets[0].entry, true);
