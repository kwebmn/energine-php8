import { defineConfig } from 'vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const rootDir = __dirname;
export const repoRoot = resolve(rootDir, '..', '..');
export const entriesDir = resolve(rootDir, 'entries');
export const outputDir = resolve(repoRoot, 'assets');
export const engineDir = resolve(repoRoot, 'engine');
export const siteDir = resolve(repoRoot, 'site');
export const vendorDir = resolve(repoRoot, 'vendor');
export const scriptsDir = resolve(repoRoot, 'scripts');

export const ckeditorSourceDir = resolve(vendorDir, 'ckeditor', 'ckeditor');
export const ckeditorTargetDir = resolve(scriptsDir, 'ckeditor');
export const ckeditorCustomPluginsDir = resolve(engineDir, 'core/modules/share/scripts/ckeditor-plugins');
export const ckeditorCustomPlugins = [ 'codemirror', 'energinefile', 'energineimage', 'energinevideo' ];
export const codemirrorSourceDir = resolve(vendorDir, 'codemirror', 'codemirror5');
export const codemirrorTargetDir = resolve(scriptsDir, 'codemirror');

export const buildTargets = [
    { name: 'energine.vendor', entry: 'energine.vendor.entry.js' },
    { name: 'energine.extended.vendor', entry: 'energine.extended.vendor.entry.js' },
    { name: 'energine', entry: 'energine.entry.js' },
    { name: 'energine.extended', entry: 'energine.extended.entry.js' },
];

export const createBuildConfig = (name, entry, emptyOutDir = false) =>
    defineConfig({
        root: rootDir,
        publicDir: false,
        base: './',
        resolve: {
            alias: {
                engine: engineDir,
                site: siteDir,
                vendor: vendorDir,
                scripts: scriptsDir,
                codemirror: codemirrorSourceDir,
            },
        },
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
