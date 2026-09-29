import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'

const require = createRequire(import.meta.url)
const conf = require('./package.json')
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const envFile = path.join(__dirname, '.env')
if (fs.existsSync(envFile)) {
    process.loadEnvFile(envFile)
}

// Root of the assCodeQuestion plugin to deploy into. Defaults to the plugin this
// repository is checked out in (<plugin>/__dev/codeblocks.js).
const pluginFolder = path.resolve(process.env.ILIAS_PLUGIN_FOLDER || path.join(__dirname, '..', '..'))
if (!fs.existsSync(path.join(pluginFolder, 'plugin.php'))) {
    console.error(`ILIAS_PLUGIN_FOLDER '${pluginFolder}' does not contain an ILIAS plugin (no plugin.php)`)
    process.exit(1)
}

const iliasBase =
    process.env.ILIAS_VUE_PATH ||
    `./Customizing/global/plugins/Modules/TestQuestionPool/Questions/assCodeQuestion/codeblocks/${conf.version}/`

const relPath = path.join('codeblocks', conf.version) + '/'
const dest = path.join(pluginFolder, relPath)
const supportDir = path.join(pluginFolder, 'classes', 'support')
const conffile = path.join(supportDir, `codeblocks-conf-${conf.version}.php`)

const run = (cmd) => execSync(cmd, { cwd: __dirname, stdio: 'inherit' })
const q = (p) => `'${p.replace(/'/g, `'\\''`)}'`

console.log(`Deploying CodeBlocks ${conf.version} to '${dest}'`)
console.log(`    - Config File at '${conffile}'`)
console.log('    - Base URL:', iliasBase)

console.log('Building CodeBlocks library...')
run('npm run build-lib')

// mirror the build (library bundle + runtime support files), dropping demo content
fs.mkdirSync(dest, { recursive: true })
run(
    `rsync -a --delete --delete-excluded --exclude .DS_Store --exclude /examples --exclude /stuff --exclude /favicon.ico ${q(path.join(__dirname, 'dist') + '/')} ${q(dest)}`
)

fs.writeFileSync(
    conffile,
    [
        '<?php',
        `define("CODEBLOCKS_VERSION",     "${conf.version}");`,
        `define("CODEBLOCKS_BASE_URI",     "${iliasBase}");`,
        `define("CODEBLOCKS_REL_PATH",     "${relPath}");`,
        'define("CODEBLOCKS_TAG_REGEX",    "/({|&#123;):(?<name>[\\w]+)}/");',
        '?>',
    ].join('\n')
)

// point the plugin at the config of this version
const codeBlocksPhp = path.join(supportDir, 'codeBlocks.php')
if (fs.existsSync(codeBlocksPhp)) {
    const src = fs.readFileSync(codeBlocksPhp, 'utf8')
    const updated = src.replace(
        /require_once\s+'codeblocks-conf-[^']+\.php';/,
        `require_once 'codeblocks-conf-${conf.version}.php';`
    )
    if (updated !== src) {
        fs.writeFileSync(codeBlocksPhp, updated)
        console.log(`    - Updated config include in '${codeBlocksPhp}'`)
    }
}

console.log('Done.')
