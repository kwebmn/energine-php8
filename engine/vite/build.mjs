import { build } from 'vite';
import { resolve } from 'node:path';
import { mkdir, rm, readdir, copyFile, readlink, symlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';

import {
    rootDir,
    entriesDir,
    outputDir,
    engineDir,
    siteDir,
    vendorDir,
    scriptsDir,
    buildTargets,
    ckeditorSourceDir,
    ckeditorTargetDir,
    ckeditorCustomPluginsDir,
    ckeditorCustomPlugins,
    codemirrorResolvedDir,
    codemirrorTargetDir,
    formatCodemirrorSourceHints,
    requireCodemirrorSourceDir,
} from './config.mjs';

if (!codemirrorResolvedDir) {
    const expectedPaths = formatCodemirrorSourceHints();
    throw new Error(`CodeMirror sources were not found in any of the expected locations:\n${expectedPaths}`);
}

const codemirrorSourceDir = requireCodemirrorSourceDir();

for (let index = 0; index < buildTargets.length; index += 1) {
    const { name, entry } = buildTargets[index];
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
                scripts: scriptsDir,
                codemirror: codemirrorResolvedDir,
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

async function copyDirectory(source, destination) {
    const entries = await readdir(source, { withFileTypes: true });
    await mkdir(destination, { recursive: true });

    for (const entry of entries) {
        const sourcePath = resolve(source, entry.name);
        const destinationPath = resolve(destination, entry.name);

        if (entry.isDirectory()) {
            await copyDirectory(sourcePath, destinationPath);
        } else if (entry.isSymbolicLink()) {
            const linkTarget = await readlink(sourcePath);
            await symlink(linkTarget, destinationPath);
        } else {
            await copyFile(sourcePath, destinationPath);
        }
    }
}

async function copyCkeditorAssets() {
    if (!existsSync(ckeditorSourceDir)) {
        throw new Error(`CKEditor sources were not found at "${ckeditorSourceDir}". Run "composer install" first.`);
    }

    await rm(ckeditorTargetDir, { recursive: true, force: true });
    await mkdir(scriptsDir, { recursive: true });
    await copyDirectory(ckeditorSourceDir, ckeditorTargetDir);

    if (!existsSync(ckeditorCustomPluginsDir)) {
        return;
    }

    for (const plugin of ckeditorCustomPlugins) {
        const pluginSource = resolve(ckeditorCustomPluginsDir, plugin);
        if (!existsSync(pluginSource)) {
            continue;
        }

        const pluginDestination = resolve(ckeditorTargetDir, 'plugins', plugin);
        await copyDirectory(pluginSource, pluginDestination);
    }
}

async function copyCodemirrorAssets() {
    await rm(codemirrorTargetDir, { recursive: true, force: true });
    await mkdir(scriptsDir, { recursive: true });
    await copyDirectory(codemirrorSourceDir, codemirrorTargetDir);
}

await copyCkeditorAssets();
await copyCodemirrorAssets();
