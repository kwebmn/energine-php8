import { resolve } from 'path';

const baseBuildOptions = {
  outDir: 'public/assets',
  emptyOutDir: false,
  sourcemap: false,
  minify: 'esbuild',
  target: 'es2018',
};

const createBundleConfig = (name, entry) => ({
  build: {
    ...baseBuildOptions,
    rollupOptions: {
      input: {
        [name]: resolve(__dirname, entry),
      },
      output: {
        format: 'iife',
        entryFileNames: `${name}.js`,
        chunkFileNames: 'chunks/[name].js',
        assetFileNames: 'assets/[name][extname]',
        manualChunks: undefined,
      },
    },
  },
});

export default [
  createBundleConfig('site', 'js/_bundles/site.bundle.js'),
  createBundleConfig('admin', 'js/_bundles/admin.bundle.js'),
];
