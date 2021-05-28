const conf = require('./package.json'),
    exec = require('child_process').exec,
    shell = require('shelljs'),
    path = require('path')

shell.env["ILIAS_VUE_PATH"] = '.'+path.join('/Customizing/global/plugins/Modules/TestQuestionPool/Questions/assCodeQuestion/codeblocks/', conf.version, '/');
const vueconf = require('./vue.config')

const dest = path.join('..', '..', 'codeblocks', conf.version)
const conffile = path.join('..', '..', 'classes', 'support', `codeblocks-conf-${conf.version}.php`)
console.log("Deploying CodeBlocks to '" + dest + "'")
console.log("    - Config File at '" + conffile + "'")

console.log("PATH", shell.env["ILIAS_VUE_PATH"] , vueconf.publicPath)
const vuecli = exec('vue-cli-service build --dest ' + dest, function(code, stdout, stderr) {
    //console.log('Exit code:', code);
    shell.rm(path.join(dest, 'index.html'))
    shell.rm(path.join(dest, 'favicon.ico'))

    shell.config.silent = true

    shell.echo('<?php ').to(conffile)
    shell.echo('define("CODEBLOCKS_VERSION",     "' + conf.version + '");').toEnd(conffile)
    shell.echo('define("CODEBLOCKS_BASE_URI",     "' + vueconf.publicPath + '");').toEnd(conffile)
    shell
        .echo(
            'define("CODEBLOCKS_REL_PATH",     "' + path.join('codeblocks', conf.version) + '/");'
        )
        .toEnd(conffile)
    shell
        .echo('define("CODEBLOCKS_TAG_REGEX",    "/({|&#123;):(?<name>[\\w]+)}/");')
        .toEnd(conffile) /* /{:([\w]+)}/  */
    shell.echo('-n', '?>').toEnd(conffile)

    const targetconf = path.join(
        '..',
        'classes',
        'support',
        'codeblocks-conf-' + conf.version + '.php'
    )
    console.log(conffile, targetconf)
    shell.cp(conffile, targetconf)
})

vuecli.stdout.on('data', function(data) {
    console.log(data)
})

vuecli.stderr.on('data', function(data) {
    console.error(data)
})
