import { defineConfig } from 'vite';
import { resolve, sep } from 'node:path';

const rootDir = resolve(process.cwd());
const scriptsDir = resolve(rootDir, 'engine/core/modules/share/scripts');

const entryPoints = {
  site: resolve(scriptsDir, 'site.entry.js'),
  admin: resolve(scriptsDir, 'admin.entry.js'),
};

const vendorMatchers = [
  /engine\/core\/modules\/share\/scripts\/jquery(\.min)?\.js$/, // jQuery runtime
  /engine\/core\/modules\/share\/scripts\/bootstrap\.bundle\.min\.js$/, // Bootstrap helpers
  /engine\/core\/modules\/share\/scripts\/jstree\//, // jsTree widget assets
  /engine\/core\/modules\/share\/scripts\/fancytree\//, // Fancytree assets
  /engine\/core\/modules\/share\/scripts\/codemirror\//, // CodeMirror editor assets
];

function isVendorModule(id) {
  const normalized = id.split(sep).join('/');
  return (
    normalized.includes('/node_modules/') ||
    vendorMatchers.some((matcher) => matcher.test(normalized))
  );
}

export default defineConfig({
  root: rootDir,
  publicDir: false,
  build: {
    emptyOutDir: false,
    outDir: resolve(rootDir, 'htdocs/assets'),
    manifest: true,
    rollupOptions: {
      input: entryPoints,
      output: {
        entryFileNames: '[name].[hash].js',
        chunkFileNames: 'chunks/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash][extname]',
        manualChunks(id) {
          if (isVendorModule(id)) {
            return 'vendor';
          }
          return undefined;
        },
      },
    },
  },
});
