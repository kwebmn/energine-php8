import { build } from 'vite';
import { resolve } from 'node:path';
import { cp, mkdir, rm } from 'node:fs/promises';

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

const ckeditorSourceDir = resolve(rootDir, 'vendor/ckeditor');
const ckeditorOutputDir = resolve(outputDir, 'scripts/ckeditor');
const ckeditorCustomPluginsDir = resolve(engineDir, 'core/modules/share/scripts/ckeditor/plugins');
const ckeditorCustomPlugins = ['energineimage', 'energinefile'];

async function copyCKEditorAssets() {
    await rm(ckeditorOutputDir, { recursive: true, force: true });
    await mkdir(ckeditorOutputDir, { recursive: true });
    await cp(ckeditorSourceDir, ckeditorOutputDir, { recursive: true });

    await mkdir(resolve(ckeditorOutputDir, 'plugins'), { recursive: true });

    await Promise.all(ckeditorCustomPlugins.map(async (pluginName) => {
        const pluginSource = resolve(ckeditorCustomPluginsDir, pluginName);
        const pluginTarget = resolve(ckeditorOutputDir, 'plugins', pluginName);
        await rm(pluginTarget, { recursive: true, force: true });
        await cp(pluginSource, pluginTarget, { recursive: true });
    }));
}

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

await copyCKEditorAssets();
