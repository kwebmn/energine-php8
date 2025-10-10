import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { existsSync, readdirSync } from 'node:fs';

export const rootDir = __dirname;
export const repoRoot = resolve(rootDir, '..', '..');
export const entriesDir = resolve(rootDir, 'entries');
export const outputDir = resolve(repoRoot, 'assets');
export const engineDir = resolve(repoRoot, 'engine');
export const siteDir = resolve(repoRoot, 'site');
export const vendorDir = resolve(repoRoot, 'vendor');

const resolveCodemirrorDir = () => {
    const baseDir = resolve(vendorDir, 'components', 'codemirror');
    const directLib = resolve(baseDir, 'lib');
    if (existsSync(directLib)) {
        return baseDir;
    }

    const packagedDir = resolve(baseDir, 'package');
    if (existsSync(resolve(packagedDir, 'lib'))) {
        return packagedDir;
    }

    try {
        const nestedLib = readdirSync(baseDir, { withFileTypes: true })
            .filter((entry) => entry.isDirectory())
            .map((entry) => resolve(baseDir, entry.name))
            .find((dir) => existsSync(resolve(dir, 'lib')));

        if (nestedLib) {
            return nestedLib;
        }
    } catch {
        // Directory may not exist yet during fresh installs; fall through to baseDir.
    }

    return baseDir;
};

const codemirrorDir = resolveCodemirrorDir();

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
                'engine/core/modules/share/scripts/codemirror': codemirrorDir,
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
