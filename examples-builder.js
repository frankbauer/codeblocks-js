import { build } from 'vite'
import shell from 'shelljs'
import path from 'path'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'

const require = createRequire(import.meta.url)
const conf = require('./package.json')
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const base = path.join('docs', 'examples')
const lib = path.join(base, 'js')
const dest = path.join(lib, 'codeblocks-js')
const destAbs = path.resolve(__dirname, dest)

console.log("Deploying CodeBlocks to '" + dest + "'")

const vue = path.join(lib, 'vue')
const jquery = path.join(lib, 'jquery')

shell.mkdir('-p', base)

shell.cp('-r', path.join('public', 'js'), base)
shell.cp('-r', path.join('public', 'resources'), base)

shell.mkdir('-p', vue)
shell.cp(path.join('node_modules', 'vue', 'dist', 'vue.runtime.min.js'), vue)

shell.mkdir('-p', jquery)
shell.cp(path.join('node_modules', 'jquery', 'dist', 'jquery.min.js'), jquery)
shell.cp(path.join('node_modules', 'jquery', 'dist', 'jquery.min.map'), jquery)

await build({
    build: {
        outDir: destAbs,
        emptyOutDir: true,
    },
})
