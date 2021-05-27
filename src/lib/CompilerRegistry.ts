import 'reflect-metadata'
import { Vue, Component, Prop } from 'vue-property-decorator'
import {
    ICompilerHashMap,
    IDomLibraray,
    ICompilerID,
    ICompilerInfo,
    IListItemData,
    ICompilerInstance,
    ICompilerRegistry,
    ICompilerIDQuery,
} from './ICompilerRegistry'

//prepare Compiler Registry
@Component
export class CompilerRegistry extends Vue implements ICompilerRegistry {
    compilers: ICompilerHashMap = {}
    libraries: IDomLibraray[] = []
    loadedURIs: string[] = []
    afterLoadFinished: (() => void)[] = []
    isLoadingLibs = false

    get languages(): IListItemData[] {
        const langs = Object.keys(this.compilers)
            .map((k) => this.compilers[k])
            .map((c) => {
                return { label: c.displayName, value: c.type }
            })
            .sort((a, b) => (a.label < b.label ? -1 : 1))
        return langs
    }

    get domLibraries(): IListItemData[] {
        const libs: IDomLibraray[] = this.libraries.filter((l) => !l.utility)
        return libs.map((l) => {
            return { label: l.displayName + ' (' + l.version + ')', value: l.key }
        })
    }

    register(compilers: ICompilerInfo[] | ICompilerInfo): void {
        if (Array.isArray(compilers)) {
            compilers.forEach((c) => this.registerSingle(c))
        } else {
            this.registerSingle(compilers)
        }
    }

    registerSingle(c: ICompilerInfo): void {
        this.compilers[c.type] = c
        c.versions.forEach((v) => {
            if (v.registerLibs) {
                v.registerLibs(this)
            }
        })
    }

    getCompiler(compilerInfo: ICompilerIDQuery): ICompilerInstance | undefined {
        const cmps = this.compilers[compilerInfo.languageType]
        if (!cmps) {
            return undefined
        }
        if (compilerInfo.version === undefined) {
            return cmps.default
        }
        let res = cmps.versions.find((e) => e.version == compilerInfo.version)
        if (res === undefined) {
            res = cmps.default
        }
        return res
    }

    versionsForLanguage(languageType: string): string[] | ['none'] {
        const c = this.compilers[languageType]
        if (c === undefined) {
            return ['none']
        }
        return c.versions.map((v) => v.version)
    }

    registerDOMLib(
        uri: string[],
        name: string,
        version: string,
        displayName: string,
        utility: boolean = false,
        order: number = 0,
        onBuildSandboxEnv: (sandbox: any) => void = () => {}
    ): void {
        this.libraries.push({
            key: name + '-' + version,
            uri: uri,
            name: name,
            version: version,
            displayName: displayName,
            didLoad: false,
            utility: utility,
            order: order,
            onBuildSandboxEnv: onBuildSandboxEnv,
        })
    }

    addLoadedToSandbox(sandbox: any) {
        this.libraries.filter((l) => l.didLoad).forEach((l) => l.onBuildSandboxEnv(sandbox))
    }

    getLibObjects(domLibs: string[]): IDomLibraray[] {
        return this.libraries.filter((l) => domLibs.indexOf(l.key) >= 0)
    }

    urisForDOMLibs(domLibs: string[]): string[] {
        const libs = this.getLibObjects(domLibs)
        const uris = libs
            .filter((l) => !l.didLoad)
            .sort((a, b) => (a.order < b.order ? 1 : -1))
            .map((l) => l.uri)
            .reduce((p, c) => c.concat(p), [])

        return uris
    }
    loadLibraries(domLibraries: string[], whenLoaded: () => void): void {
        const libs = this.urisForDOMLibs(domLibraries)
        const dlibs = this.getLibObjects(domLibraries)
        this.loadURIs(
            libs,
            function () {
                dlibs.forEach((l) => (l.didLoad = true))
                whenLoaded()
            }.bind(this)
        )
    }
    private loadURIsIter(libs: string[], whenLoaded: () => void): void {
        console.log(libs)
        let loadCount = 0
        const didLoad = (u: string) => {
            loadCount++
            if (loadCount == libs.length) {
                whenLoaded()
            }
        }
        libs.forEach((uri: string) => {
            if (this.loadedURIs.indexOf(uri) >= 0) {
                didLoad(uri)
                return
            }
            this.loadedURIs.push(uri)

            const script = document.createElement('script')
            script.src = uri
            console.log('[Loading Library from ' + uri + ']')
            script.onload = function () {
                console.log('[Loaded ' + uri + ']')
                didLoad(uri)
            }
            document.head.appendChild(script)
        })
    }

    private loadURIs(libs: string[], whenLoaded: () => void): void {
        //make sure we serialize all loads !!!
        if (this.isLoadingLibs) {
            //queue the load
            this.afterLoadFinished.push(() => {
                this.loadURIs(libs, whenLoaded)
            })
            return
        }
        this.isLoadingLibs = true

        const self = this

        const loadLib = function (uris, idx) {
            if (idx >= uris.length) {
                whenLoaded()

                //something tried to queue another load
                // => dequeu it and run it now
                self.isLoadingLibs = false
                if (self.afterLoadFinished.length > 0) {
                    const next = self.afterLoadFinished.shift()
                    if (next) {
                        next()
                    }
                }
                return
            }

            const uri = uris[idx]

            //already loaded
            if (self.loadedURIs.indexOf(uri) >= 0) {
                loadLib(uris, idx + 1)
                return
            }
            self.loadedURIs.push(uri)

            const script = document.createElement('script')
            script.src = uri
            console.log('[Loading Library from ' + uri + ']')
            script.onload = function () {
                loadLib(uris, idx + 1)
            }
            document.head.appendChild(script)
        }

        loadLib(libs, 0)
    }
}

export const compilerRegistry = new CompilerRegistry()

//load all available compilers
import { JavaCompilers } from '../compiler/java'
compilerRegistry.register(JavaCompilers)

import { JavascriptCompilers } from '../compiler/javascript'
compilerRegistry.register(JavascriptCompilers)

import { PythonCompilers } from '../compiler/python'
compilerRegistry.register(PythonCompilers)

import { GLSLCompilers } from '../compiler/glsl'
compilerRegistry.register(GLSLCompilers)

compilerRegistry.registerDOMLib(
    [
        Vue.$CodeBlock.baseurl + 'js/d3/5.3.8/d3.v5.min.js',
        Vue.$CodeBlock.baseurl + 'js/d3/5.3.8/helper.js',
    ],
    'd3',
    '5.13.4',
    'D3',
    false,
    1100,
    (sandbox) => {
        sandbox.d3 = (window as any).d3
    }
)

compilerRegistry.registerDOMLib(
    [
        Vue.$CodeBlock.baseurl + 'js/d3/6.2.0/d3.v6.min.js',
        //Vue.$CodeBlock.baseurl + 'js/d3/6.2.0/helper.v6.js'
    ],
    'd3',
    '6.2.0',
    'D3',
    false,
    1000,
    (sandbox) => {
        sandbox.d3 = (window as any).d3
    }
)

compilerRegistry.registerDOMLib(
    [Vue.$CodeBlock.baseurl + 'js/chart.js/3.3.0/chart.min.js'],
    'chart',
    '3.3.0',
    'Chart.JS',
    false,
    2000,
    (sandbox) => {
        sandbox.Chart = (window as any).Chart
    }
)

compilerRegistry.registerDOMLib(
    [
        Vue.$CodeBlock.baseurl + 'js/three.js/r0/three.min.js',
        Vue.$CodeBlock.baseurl + 'js/three.js/r0/controls/OrbitControls.js',
        Vue.$CodeBlock.baseurl + 'js/three.js/r0/controls/TrackballControls.js',
        Vue.$CodeBlock.baseurl + 'js/three.js/r0/Detector.js',
        Vue.$CodeBlock.baseurl + 'js/three.js/helper.r0.js',
    ],
    '3js',
    'r0',
    'Three.JS',
    false,
    3000,
    (sandbox) => {
        sandbox.THREE = (window as any).THREE
    }
)

compilerRegistry.registerDOMLib(
    [Vue.$CodeBlock.baseurl + 'js/brain.js/2.0.0-alpha/brain-browser.min.js'],
    'brain',
    '2.0.0',
    'Brain.JS',
    false,
    4000,
    (sandbox) => {
        sandbox.brain = (window as any).brain
    }
)

compilerRegistry.registerDOMLib(
    [
        Vue.$CodeBlock.baseurl + 'js/tensorflow.js/2.0.0/tf.min.js',
        //Vue.$CodeBlock.baseurl + 'js/tensorflow.js/2.0.0/tfjs-vis.umd.min.js',
    ],
    'tf',
    '2.0.0',
    'TensorFlow.JS',
    false,
    5000,
    (sandbox) => {
        sandbox.tf = (window as any).tf
        //sandbox.tfvis = (window as any).tfvis
    }
)

compilerRegistry.registerDOMLib(
    [
        Vue.$CodeBlock.baseurl + 'js/phaser/3.54.0/phaser.min.js',
        Vue.$CodeBlock.baseurl + 'js/phaser/3.54.0/support.js',
    ],
    'phaser',
    '3.54',
    'Phaser',
    false,
    6000,
    (sandbox: any) => {
        sandbox.Phaser = (window as any).Phaser
        sandbox.IsometricMapGame = (window as any).IsometricMapGame
    }
)

export default compilerRegistry
