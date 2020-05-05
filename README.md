# CodeBlocks.js
CodeBlocks is a Vue app framework designed to enable in-Browser source-code editing. The System allows you to compile and run specific languages (currently **Python**, **Java**, and **JavaScript**) clientside in the browser.

The app provides both an easy to use edit mode for questions as well as questionnaire mode.


## Project setup
You need to install npm to compile the app/framework. 

After that, you can install all dependencies by running
```
npm install
```
in the folder with this README.


### Compiles and hot-reloads for development
During development, you can utilize a simple dev-server that recompiles and servers the app on demand.
```
npm run serve
```

### Compiles and minifies for production
You can build all required files for distribution using
```
npm run build
```
The build command will (by default) deploy the app to the `./dist`-Folder.

### Customize base-configuration
See [Configuration Reference](https://cli.vuejs.org/config/).

### Building for Ilias
The **Code Question**-Plugin for Ilias makes heavy use of this app.(https://github.com/frankbauer/ilias-asscodequestion). When production-building for the plugin, you need to run another build script that takes care of some unique settings.

```
npm run build-ilias
```

The command deploys the app to`../codeblocks/<version>/` (relative to the root folder of this project).

## More Info
Please refer to our Wiki for more Infos:  https://github.com/frankbauer/codeblocks-js/wiki 
