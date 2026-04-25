import { build } from 'vite'
import shell from 'shelljs'
import path from 'path'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'

const require = createRequire(import.meta.url)
const conf = require('./package.json')
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const iliasBase =
    process.env.ILIAS_VUE_PATH ||
    path.join(
        '/Customizing/global/plugins/Modules/TestQuestionPool/Questions/assCodeQuestion/codeblocks/',
        conf.version,
        '/'
    )

const dest = path.join('..', '..', 'codeblocks', conf.version)
const destAbs = path.resolve(__dirname, dest)
const conffile = path.join('..', '..', 'classes', 'support', `codeblocks-conf-${conf.version}.php`)

console.log("Deploying CodeBlocks to '" + dest + "'")
console.log("    - Config File at '" + conffile + "'")
console.log('Base URL:', iliasBase)

await build({
    base: iliasBase,
    build: {
        outDir: destAbs,
        emptyOutDir: true,
    },
})

shell.config.silent = true

shell.echo('<?php ').to(conffile)
shell.echo('define("CODEBLOCKS_VERSION",     "' + conf.version + '");').toEnd(conffile)
shell.echo('define("CODEBLOCKS_BASE_URI",     "' + iliasBase + '");').toEnd(conffile)
shell
    .echo('define("CODEBLOCKS_REL_PATH",     "' + path.join('codeblocks', conf.version) + '/");')
    .toEnd(conffile)
shell.echo('define("CODEBLOCKS_TAG_REGEX",    "/({|&#123;):(?<name>[\\w]+)}/");').toEnd(conffile)
shell.echo('-n', '?>').toEnd(conffile)

const targetconf = path.join('..', 'classes', 'support', 'codeblocks-conf-' + conf.version + '.php')
console.log(conffile, targetconf)
shell.cp(conffile, targetconf)
