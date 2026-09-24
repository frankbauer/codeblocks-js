import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const envFile = path.join(__dirname, '.env')
if (fs.existsSync(envFile)) {
    process.loadEnvFile(envFile)
}

const lernwerk = process.env.LERNWERK_FOLDER
if (!lernwerk) {
    console.error('LERNWERK_FOLDER is not set (add it to .env)')
    process.exit(1)
}
if (!fs.existsSync(lernwerk)) {
    console.error(`LERNWERK_FOLDER '${lernwerk}' does not exist`)
    process.exit(1)
}

const srcJs = path.join(__dirname, 'dist', 'js')
const destJs = path.join(lernwerk, 'js')

const run = (cmd) => execSync(cmd, { cwd: __dirname, stdio: 'inherit' })
const q = (p) => `'${p.replace(/'/g, `'\\''`)}'`

console.log('Building CodeBlocks library...')
run('npm run build-lib')

// the library bundle itself: mirror exactly, so stale files are removed
console.log(`Syncing codeblocks-js to '${path.join(destJs, 'codeblocks-js')}'`)
run(
    `rsync -a --delete --exclude .DS_Store ${q(path.join(srcJs, 'codeblocks-js') + '/')} ${q(path.join(destJs, 'codeblocks-js') + '/')}`
)

// runtime support files (language workers, teavm, pyodide, 3rd party libs):
// copy changed files only, keep anything lernwerk adds on its own
console.log(`Syncing runtime files to '${destJs}'`)
run(`rsync -a --exclude .DS_Store --exclude codeblocks-js ${q(srcJs + '/')} ${q(destJs + '/')}`)

console.log('Done.')
