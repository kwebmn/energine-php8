import { build } from 'vite';
import { resolve, join } from 'node:path';
import { cpSync, existsSync, mkdirSync, rmSync, mkdtempSync, readdirSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';
import { resolveBuildTargets } from './config.mjs';

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

const CODEMIRROR_PLUGIN_ZIP =
    'https://download.ckeditor.com/codemirror/releases/codemirror_1.17.7.zip';

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

const targets = resolveBuildTargets();
const vendorBundles = new Set(['energine.vendor', 'energine.mdvendor', 'energine.extended.vendor']);

for (let index = 0; index < targets.length; index += 1) {
    const { name, entry } = targets[index];
    const isVendor = vendorBundles.has(name);
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

    const codemirrorPluginDir = resolve(ckeditorTargetDir, 'plugins/codemirror');
    const codemirrorPluginEntry = resolve(codemirrorPluginDir, 'plugin.js');
    if (!existsSync(codemirrorPluginEntry)) {
        const tempDir = mkdtempSync(join(tmpdir(), 'ckeditor-codemirror-'));
        const archivePath = resolve(tempDir, 'codemirror.zip');
        try {
            execSync(`curl -fsSL "${CODEMIRROR_PLUGIN_ZIP}" -o "${archivePath}"`, { stdio: 'inherit' });
            execSync(`unzip -q "${archivePath}" -d "${tempDir}"`, { stdio: 'inherit' });
            const extractedDir = resolve(tempDir, 'codemirror');
            if (!existsSync(extractedDir)) {
                throw new Error('CKEditor codemirror plugin archive did not contain expected directory.');
            }
            if (existsSync(codemirrorPluginDir)) {
                rmSync(codemirrorPluginDir, { recursive: true, force: true });
            }
            mkdirSync(codemirrorPluginDir, { recursive: true });
            cpSync(extractedDir, codemirrorPluginDir, { recursive: true });
        } catch (error) {
            console.warn('[build] Unable to download CKEditor codemirror plugin:', error);
        } finally {
            rmSync(tempDir, { recursive: true, force: true });
        }
    }
}
