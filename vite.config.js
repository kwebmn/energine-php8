import { resolve } from 'path';
import { defineConfig } from 'vite';

const baseBuildOptions = {
  outDir: 'public/assets',
  emptyOutDir: false,
  sourcemap: false,
  minify: 'esbuild',
  target: 'es2018',
};

const bundles = {
  site: {
    entry: 'js/_bundles/site.bundle.js',
    fileName: 'site.js',
  },
  admin: {
    entry: 'js/_bundles/admin.bundle.js',
    fileName: 'admin.js',
  },
};

export default defineConfig(({ mode }) => {
  const bundle = mode === 'admin' ? bundles.admin : bundles.site;

  return {
    build: {
      ...baseBuildOptions,
      rollupOptions: {
        input: resolve(__dirname, bundle.entry),
        output: {
          format: 'iife',
          entryFileNames: bundle.fileName,
          chunkFileNames: 'chunks/[name].js',
          assetFileNames: 'assets/[name][extname]',
        },
      },
    },
  };
});
