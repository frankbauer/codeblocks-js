import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// the example pages (docs/examples/*.html) load the library the same way ILIAS
// and lernwerk do: <meta name="codeblocks-baseurl">, jQuery, codeblocks.css and
// an ES module import of codeblocks.umd.js (Vue is bundled into the library)
const dest = path.join(__dirname, 'docs', 'examples')
// the examples only need the runtime libraries; everything else in dist
// (assets, resources, common, examples, stuff) is demo/ILIAS content
const folders = ['js']

const run = (cmd) => execSync(cmd, { cwd: __dirname, stdio: 'inherit' })
const q = (p) => `'${p.replace(/'/g, `'\\''`)}'`

console.log(`Deploying CodeBlocks examples to '${dest}'`)

console.log('Building CodeBlocks library...')
run('npm run build-lib')

// mirror exactly, so files removed from CodeBlocks disappear here too
fs.mkdirSync(dest, { recursive: true })
for (const entry of fs.readdirSync(dest, { withFileTypes: true })) {
    if (entry.isDirectory() && !folders.includes(entry.name)) {
        console.log(`Removing '${entry.name}'`)
        fs.rmSync(path.join(dest, entry.name), { recursive: true, force: true })
    }
}
for (const folder of folders) {
    console.log(`Syncing '${folder}'`)
    run(`rsync -a --delete --delete-excluded --exclude .DS_Store ${q(path.join(__dirname, 'dist', folder) + '/')} ${q(path.join(dest, folder) + '/')}`)
}

console.log('Done.')
