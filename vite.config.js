import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler', // Use the modern Sass API
      },
      sass: {
        api: 'modern-compiler', // Use the modern Sass API
      },
    },
  },
  define: {
    'process.env': {},
    // If you need specific env variables:
    // 'process.env.NODE_ENV': JSON.stringify('production')
  },
  build: {
    lib: {
      entry: resolve(__dirname, './src/main.ts'),
      name: 'CodeblocksJS',
      fileName: 'codeblocks',
      formats: ['umd'],
    },
    rollupOptions: {
      // Remove external: ['vue'] to include Vue in the bundle
      output: {
        // Global variables are still needed for UMD build
        globals: {
          vue: 'Vue',
        },
        assetFileNames: (assetInfo) => {
          // Handle font files
          if (/\.(woff2?|ttf|eot)$/.test(assetInfo.name)) {
            return 'fonts/[name][extname]'
          }
          if (assetInfo.name === 'style.css') {
            return 'codeblocks.css'
          }
          return assetInfo.name
        },
      },
    },
    // This ensures all CSS is extracted to a single file
    cssCodeSplit: false,
    // Ensure assets are copied
    assetsInclude: ['**/*.woff2', '**/*.ttf', '**/*.eot'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      vue: 'vue/dist/vue.esm-bundler',
      $: 'jquery',
      jQuery: 'jquery',
    },
  },
  optimizeDeps: {
    include: ['jquery', 'jquery.terminal', 'vue'],
  },
})
