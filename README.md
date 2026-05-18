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

Deploys the library to `docs/examples/js/codeblocks-js/`.

## Demos

We currently have a [simple demo](https://frankbauer.github.io/codeblocks-js/docs/examples/simple.html) online.

## More Info

Please refer to our [Wiki](https://github.com/frankbauer/codeblocks-js/wiki) for more Infos.

## AI Completions

You can setup the AI-Completion Model by running

```bash
git clone https://huggingface.co/mlc-ai/Qwen2.5-Coder-1.5B-Instruct-q4f32_1-MLC \
    public/ai-models/models/Qwen2.5-Coder-1.5B-Instruct-q4f32_1-MLC
 curl -L \
    "https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_83/base/Qwen2-1.5B-Instruct-q4f32_1_cs1k-webgpu.wasm" \
    -o "public/ai-models/models/Qwen2.5-Coder-1.5B-Instruct-q4f32_1-MLC/model-lib.wasm"
```
