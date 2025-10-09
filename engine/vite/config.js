import { defineConfig } from 'vite';
import path from 'node:path';

const projectRoot = process.cwd();
const outDir = path.resolve(projectRoot, 'assets');

export default defineConfig({
  root: projectRoot,
  base: '/assets/',
  build: {
    outDir,
    emptyOutDir: true,
    target: 'es2019',
    minify: 'esbuild',
    sourcemap: false,
    cssCodeSplit: true,
    manifest: false,
    rollupOptions: {
      input: {
        'energine.vendor':   path.resolve(projectRoot, 'engine/vite/entries/energine.vendor.entry.js'),
        'energine':          path.resolve(projectRoot, 'engine/vite/entries/energine.entry.js'),
        'energine.extended': path.resolve(projectRoot, 'engine/vite/entries/energine.extended.entry.js'),
      },
      output: {
        format: 'es',
        entryFileNames: (chunk) => ({
          'energine.vendor':   'energine.vendor.js',
          'energine':          'energine.js',
          'energine.extended': 'energine.extended.js',
        }[chunk.name] ?? '[name].js'),
        assetFileNames: (info) => {
          const n = (info.name || '').toLowerCase();
          if (n.endsWith('.css'))                         return '[name][extname]';
          if (/\.(woff2?|ttf|eot|otf)$/.test(n))          return 'webfonts/[name][extname]';
          if (/\.(png|jpe?g|gif|svg|webp|avif)$/.test(n)) return 'images/[name][extname]';
          return 'assets/[name][extname]';
        },
      },
    },
  },
});
