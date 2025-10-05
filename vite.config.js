import { resolve } from 'path';

export default {
  build: {
    outDir: 'public/assets',
    emptyOutDir: false,
    sourcemap: false,
    minify: 'esbuild',
    target: 'es2018',
    rollupOptions: {
      input: {
        site: resolve(__dirname, 'js/_bundles/site.bundle.js'),
        admin: resolve(__dirname, 'js/_bundles/admin.bundle.js'),
      },
      output: {
        format: 'iife',
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name].js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
};
