import { build } from 'vite';
import { resolve, join } from 'node:path';
import { cpSync, existsSync, mkdirSync, rmSync, mkdtempSync, readdirSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';

const rootDir = resolve(process.cwd(), 'engine/vite');
const repoRoot = resolve(rootDir, '..', '..');
const entriesDir = resolve(rootDir, 'entries');
const outputDir = resolve(repoRoot, 'assets');
const engineDir = resolve(repoRoot, 'engine');
const siteDir = resolve(repoRoot, 'site');
const vendorDir = resolve(repoRoot, 'vendor');
const ckeditorSourceDir = resolve(vendorDir, 'ckeditor', 'ckeditor');
const ckeditorTargetDir = resolve(outputDir, 'ckeditor');
const customPluginSources = [
    {
        source: resolve(engineDir, 'core/modules/share/scripts/ckeditor/plugins/energinefile'),
        target: resolve(ckeditorTargetDir, 'plugins/energinefile'),
    },
    {
        source: resolve(engineDir, 'core/modules/share/scripts/ckeditor/plugins/energineimage'),
        target: resolve(ckeditorTargetDir, 'plugins/energineimage'),
    },
];

const removePhpFiles = (directory) => {
    if (!existsSync(directory)) {
        return;
    }
    const entries = readdirSync(directory, { withFileTypes: true });
    entries.forEach((entry) => {
        const target = resolve(directory, entry.name);
        if (entry.isDirectory()) {
            removePhpFiles(target);
        } else if (entry.isFile() && target.endsWith('.php')) {
            unlinkSync(target);
        }
    });
};

const removeSamplesDirectory = (directory) => {
    const samples = resolve(directory, 'samples');
    if (existsSync(samples)) {
        rmSync(samples, { recursive: true, force: true });
    }
};

const targets = [
    { name: 'energine.vendor', entry: 'energine.vendor.entry.js' },
    { name: 'energine.extended.vendor', entry: 'energine.extended.vendor.entry.js' },
    { name: 'energine.ckeditor', entry: 'energine.ckeditor.entry.js' },
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
            target: isVendor ? 'es2018' : 'es2022',
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

if (existsSync(ckeditorSourceDir)) {
    if (existsSync(ckeditorTargetDir)) {
        rmSync(ckeditorTargetDir, { recursive: true, force: true });
    }
    mkdirSync(outputDir, { recursive: true });
    cpSync(ckeditorSourceDir, ckeditorTargetDir, { recursive: true });
    removePhpFiles(ckeditorTargetDir);
    removeSamplesDirectory(ckeditorTargetDir);

    customPluginSources.forEach(({ source, target }) => {
        if (!existsSync(source)) {
            return;
        }
        if (existsSync(target)) {
            rmSync(target, { recursive: true, force: true });
        }
        mkdirSync(target, { recursive: true });
        cpSync(source, target, { recursive: true });
    });

    // The CKEditor CodeMirror plugin is no longer bundled; legacy download logic removed.
}
