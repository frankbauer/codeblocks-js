import { defineConfig } from 'tsup'

export default defineConfig({
    entry: ['dev/phaser/support.ts'],
    outDir: 'public/js/phaser/3.54.0',
    format: ['esm'],
    sourcemap: true,
    dts: false,
    clean: false,
    tsconfig: 'tsconfig-phaser.json',
    esbuildOptions(options) {
        options.treeShaking = false
    },
})
