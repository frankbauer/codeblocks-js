import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'fs'
import path from 'path'
import { resolve } from 'path'

const MIT_TERMS = `Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`

// ship the CodeBlocks license next to the library bundle and complete the
// generated third-party license file for packages that publish no LICENSE file
const codeblocksLicense = () => ({
  name: 'codeblocks-license',
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'js/codeblocks-js/LICENSE',
      source: fs.readFileSync(resolve(__dirname, 'LICENSE'), 'utf8'),
    })
  },
  // vite:license emits its file after all generateBundle hooks, so patch it on disk
  writeBundle(options) {
    // the Geist fonts come from public/ (library mode would inline them as base64);
    // make their URLs relative to codeblocks.css so they resolve wherever it is deployed
    const css = path.join(options.dir, 'js/codeblocks-js/codeblocks.css')
    if (fs.existsSync(css)) {
      fs.writeFileSync(css, fs.readFileSync(css, 'utf8').replaceAll('url(/js/codeblocks-js/fonts/', 'url(fonts/'))
    }

    const thirdParty = path.join(options.dir, 'js/codeblocks-js/THIRD-PARTY-LICENSES.md')
    if (!fs.existsSync(thirdParty)) return
    const source = fs.readFileSync(thirdParty, 'utf8').replace(
      /^## (\S+) - (\S+) \((.+)\)\n\n(?=## |$)/gm,
      (section, name, version, license) => {
        let pkg = {}
        try {
          pkg = JSON.parse(fs.readFileSync(resolve(__dirname, 'node_modules', name, 'package.json'), 'utf8'))
        } catch {
          this.warn(`no license text for bundled package ${name}`)
          return section
        }
        const author = typeof pkg.author === 'object' ? pkg.author.name : (pkg.author ?? `${name} authors`)
        const repo = typeof pkg.repository === 'object' ? pkg.repository.url : (pkg.repository ?? '')
        const body =
          license === 'MIT'
            ? `MIT License\n\nCopyright (c) ${author}\n\n${MIT_TERMS}`
            : `Licensed under ${license} by ${author}. See ${repo || `https://www.npmjs.com/package/${name}`}`
        return `## ${name} - ${version} (${license})\n\n${body}\n\n`
      }
    )
    fs.writeFileSync(thirdParty, source)
  },
})

export default defineConfig({
  plugins: [vue(), codeblocksLicense()],
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
    sourcemap: true,
    // licenses of all npm dependencies bundled into codeblocks.umd.*
    license: { fileName: 'js/codeblocks-js/THIRD-PARTY-LICENSES.md' },
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