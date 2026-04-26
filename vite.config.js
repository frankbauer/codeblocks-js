import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  css: {
    preprocessorOptions: {
      scss: { api: 'modern-compiler' },
      sass: { api: 'modern-compiler' },
    },
  },
  define: {
    // This ensures that any check for process.env.NODE_ENV is replaced with a string
    'process.env.NODE_ENV': JSON.stringify('production'),
    // This catches general references to process.env
    'process.env': {},
    // Optional: catch global process calls if specific libs are very stubborn
    'process': { env: { NODE_ENV: 'production' } },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, './src/main.ts'),
      name: 'CodeblocksJS',
      fileName: (format) => `js/codeblocks-js/codeblocks.${format === 'es' ? 'umd.js' : 'umd.cjs'}`,
      formats: ['es', 'umd'],
    },
    rollupOptions: {
      external: [], 
      output: {
        globals: {
          vue: 'Vue',
        },
        exports: 'named', 
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name ?? '';
  
          // Handle CSS
          if (name.endsWith('.css')) {
            return 'js/codeblocks-js/codeblocks.css';
          }
          
          // Handle Fonts
          if (/\.(woff2?|ttf|eot)$/.test(name)) {
            return 'js/codeblocks-js/fonts/[name][extname]';
          }

          // Handle Images (png, jpg, svg, etc.)
          if (/\.(png|jpe?g|gif|svg|webp)$/.test(name)) {
            return 'js/codeblocks-js/images/[name][extname]';
          }

          return 'js/codeblocks-js/assets/[name][extname]';
        },
      },
    },
    cssCodeSplit: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Important for bundling Vue into the lib
      vue: 'vue/dist/vue.esm-bundler',
      $: 'jquery',
      jQuery: 'jquery',
    },
  },
  optimizeDeps: {
    include: ['jquery', 'jquery.terminal', 'vue'],
  },
})