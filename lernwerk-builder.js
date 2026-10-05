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

// every top-level entry of dist/js (library bundle, language workers, teavm,
// pyodide, 3rd party libs) is mirrored exactly, so files removed from
// CodeBlocks also disappear in lernwerk. Entries lernwerk adds on its own
// (e.g. js/vue, js/jquery) are left alone.
const manifestFile = path.join(destJs, '.codeblocks-manifest.json')
const entries = fs.readdirSync(srcJs).filter((name) => name !== '.DS_Store')

// remove entries a previous deployment created that no longer exist in CodeBlocks
if (fs.existsSync(manifestFile)) {
    const previous = JSON.parse(fs.readFileSync(manifestFile, 'utf8'))
    for (const name of previous.filter((name) => !entries.includes(name))) {
        console.log(`Removing stale '${path.join(destJs, name)}'`)
        fs.rmSync(path.join(destJs, name), { recursive: true, force: true })
    }
}

fs.mkdirSync(destJs, { recursive: true })
for (const name of entries) {
    const src = path.join(srcJs, name)
    const dst = path.join(destJs, name)
    console.log(`Syncing '${name}' to '${dst}'`)
    if (fs.statSync(src).isDirectory()) {
        run(`rsync -a --delete --delete-excluded --exclude .DS_Store ${q(src + '/')} ${q(dst + '/')}`)
    } else {
        run(`rsync -a ${q(src)} ${q(dst)}`)
    }
}
fs.writeFileSync(manifestFile, JSON.stringify(entries, null, 4) + '\n')

// scene assets (public/assets/<scene>) used by the lernwerk example scenes in common/scene,
// mirrored to <lernwerk>/assets/<scene> (same layout as an ILIAS installation: assets/ next to common/)
const sceneAssets = ['robots', 'floatingworld', 'cherrygame', 'maze', 'universum', 'snowmeadow', 'seasonal', 'sunnyhill']
const destAssets = path.join(lernwerk, 'assets')
fs.mkdirSync(destAssets, { recursive: true })
for (const name of sceneAssets) {
    const src = path.join(__dirname, 'dist', 'assets', name)
    const dst = path.join(destAssets, name)
    console.log(`Syncing 'assets/${name}' to '${dst}'`)
    run(`rsync -a --delete --delete-excluded --exclude .DS_Store ${q(src + '/')} ${q(dst + '/')}`)
}

console.log('Done.')
