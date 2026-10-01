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


### Development server (hot-reload)
During development, start the Vite dev server:
```
npm run dev
```

### Build for production
Build the library bundle to `./dist`:
```
npm run build
```

### Building for Ilias
The **Code Question**-Plugin for Ilias makes heavy use of this app.(https://github.com/frankbauer/ilias-asscodequestion). When production-building for the plugin, run:

```
npm run build-ilias
```

The command deploys the app to `../codeblocks/<version>/` (relative to the root folder of this project) and generates the required PHP config file.

To deploy with a custom base URL, set `ILIAS_VUE_PATH` before running:
```
ILIAS_VUE_PATH=/my/custom/path/ npm run build-ilias
```

### Building examples
```
npm run build-examples
```
Builds the library and mirrors its runtime libraries (`js/`) to `docs/examples/`. The examples contain no image assets.

### Licensed assets
Some tree images in `public/assets/trees/` (listed in `licensed-assets.json`) are licensed from [Freepik](https://www.freepik.com) and may be used in CodeBlocks, but must not be published in this repository. They are git-ignored and distributed separately as `codeblocks-licensed-assets.zip` (ask the maintainers for the download location):

```
npm run extract-licensed-assets
```
extracts `codeblocks-licensed-assets.zip` from the repository root into `public/`, where the build scripts pick the images up. Maintainers create the zip (images + licenses) from their working copy with
```
npm run build-licensed-assets
```

## Demos
We currently have a [simple demo](https://frankbauer.github.io/codeblocks-js/docs/examples/simple.html) online.

## More Info
Please refer to our [Wiki](https://github.com/frankbauer/codeblocks-js/wiki) for more Infos.
