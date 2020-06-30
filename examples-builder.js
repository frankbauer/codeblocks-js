const conf = require('./package.json'),
    exec = require('child_process').exec,
    shell = require('shelljs'),
    path = require('path'),
    vueconf = require('./vue.config')

const base = path.join('docs', 'examples')
const lib = path.join(base, 'js')
const dest = path.join(lib, 'codeblocks-js')
    
console.log("Deploying CodeBlocks to '" + dest + "'")

const vue = path.join(lib, 'vue')
const jquery = path.join(lib, 'jquery')

shell.mkdir('-p', base)

shell.cp('-r', path.join('public', 'js'), base)

shell.mkdir('-p', vue)
shell.cp(path.join('node_modules', 'vue', 'dist', 'vue.runtime.min.js'), vue)

shell.mkdir('-p', jquery)
shell.cp(
    path.join('node_modules', 'jquery', 'dist', 'jquery.min.js'),
    jquery
)
shell.cp(
    path.join('node_modules', 'jquery', 'dist', 'jquery.min.map'),
    jquery
)
const vuecli = exec(
    'vue-cli-service build  --entry ./src/main.ts --target lib --dest ' + dest,
    function(code, stdout, stderr) {
        //console.log('Exit code:', code);
        shell.rm(path.join(dest, 'demo.html'))
        shell.rm(path.join(dest, 'codeblocks.common.js'))
        shell.rm(path.join(dest, 'codeblocks.common.js.map'))
    }
)

vuecli.stdout.on('data', function(data) {
    console.log(data)
})

vuecli.stderr.on('data', function(data) {
    console.error(data)
})
