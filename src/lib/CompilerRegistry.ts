
import 'reflect-metadata'
import { Vue, Component, Prop } from 'vue-property-decorator'

interface IDomLibraray {
    key:string
    uri:string[]
    name:string
    version:string
    displayName:string
    didLoad:boolean
    utility:boolean
    order:number
}

export interface IListItemData {
    label: string
    value: string
}

export interface ICompilerInfo {
    type: string
    displayName: string
    versions: any[]
    default: any
}

export interface ICompilerID {
    languageType: string
    version: string
}

//prepare Compiler Registry
export class CompilerRegistry extends Vue {
    compilers = new Map<string, ICompilerInfo>()
    libraries:IDomLibraray[] = []
    loadedURIs: string[] = []
    afterLoadFinished: (() => void)[] = []
    isLoadingLibs = false

    get languages() : IListItemData[] {
        const langs = Object
            .keys(this.compilers)
            .map(k => this.compilers[k])
            .map(c => {return {label:c.displayName, value:c.type}})
            .sort((a, b) => a.label < b.label ? -1 : 1)
        return langs
    }

    get domLibraries() : IListItemData[]{
        const libs : IDomLibraray[] = this.libraries.filter(l=>!l.utility);
        return libs.map(l => {return { label: l.displayName + ' ('+l.version+')', value:l.key} });
    }   
    
    
    register(compilers:ICompilerInfo[]): void{
        if (Array.isArray(compilers)){
            compilers.forEach(c => this.registerSingle(c))
        } else {
            this.registerSingle(compilers);
        }
    }

    registerSingle(c:ICompilerInfo): void{
        this.compilers.set(c.type, c)            
        c.versions.forEach( v => {
            if (v.registerLibs) {
                v.registerLibs(this);
            }
        })
    }

    getCompiler(compilerInfo:ICompilerID) : ICompilerInfo|undefined {
        let cmps = this.compilers.get(compilerInfo.languageType)
        if (!cmps) return undefined;

        let res = cmps.versions.find(e => e.version == compilerInfo.version);
        if (res===undefined) res = cmps.default;                      
        return res;
    }

    versionsForLanguage(languageType:string) : any[]|['none']{
        const c = this.compilers[languageType];
        if (c===undefined) return ['none'];
        return c.versions.map(v => v.version);
    }

    registerDOMLib(uri:string[], name:string, version:string, displayName:string, utility:boolean=false, order:number=0) : void{
        this.libraries.push({
            key:name+"-"+version,
            uri:uri,
            name:name,
            version:version,
            displayName:displayName,
            didLoad:false,
            utility:utility,
            order:order
        })
    }

    getLibObjects(domLibs:string[]) :IDomLibraray[]{
        return  this.libraries.filter(l => domLibs.indexOf(l.key)>=0);
    }

    urisForDOMLibs(domLibs:string[]):string[]{
        const libs = this.getLibObjects(domLibs);
        const uris = libs
            .filter(l=> !l.didLoad)
            .sort((a, b) => a.order < b.order ? 1 : -1)
            .map(l => l.uri)                
            .reduce((p, c) => c.concat(p), []);

        return uris;
    }
    loadLibraries(domLibraries:string[], whenLoaded:() => void) : void{
        const libs = this.urisForDOMLibs(domLibraries);
        const dlibs = this.getLibObjects(domLibraries);
        this.loadURIs(libs, function(){                
            dlibs.forEach(l => l.didLoad = true)
            whenLoaded();
        }.bind(this))
    }
    private loadURIsIter(libs:string[], whenLoaded:() => void) : void{ 
        console.log(libs);
        let loadCount = 0;
        let didLoad = (u:string) => {
            loadCount++;
            if (loadCount == libs.length){
                whenLoaded();
            }
        }
        libs.forEach((uri:string) => {
            if (this.loadedURIs.indexOf(uri)>=0){
                didLoad(uri);
                return;
            }
            this.loadedURIs.push(uri);

            let script = document.createElement('script');
            script.src = uri;
            console.log("[Loading Library from " + uri+"]")
            script.onload = function () {  
                console.log("[Loaded " + uri+"]")
                didLoad(uri);
            };
            document.head.appendChild(script);
        })
    }

    private loadURIs(libs:string[], whenLoaded:() => void) : void{
        //make sure we serialize all loads !!!
        if (this.isLoadingLibs){
            //queue the load
            this.afterLoadFinished.push(()=>{
                this.loadURIs(libs, whenLoaded);
            })
            return;
        }
        this.isLoadingLibs = true;

        const self = this;
        
        let loadLib = function(uris, idx){
            if (idx>=uris.length) {
                whenLoaded();

                //something tried to queue another load
                // => dequeu it and run it now
                self.isLoadingLibs = false;
                if (self.afterLoadFinished.length>0){
                    let next = self.afterLoadFinished.shift();
                    if (next) next();
                }
                return;
            }

            const uri = uris[idx];  

            //already loaded
            if (self.loadedURIs.indexOf(uri)>=0) {
                loadLib(uris, idx+1);
                return;
            }
            self.loadedURIs.push(uri);              
            
            let script = document.createElement('script');
            script.src = uri;
            console.log("[Loading Library from " + uri+"]")
            script.onload = function () {  
                loadLib(uris, idx+1);
            };
            document.head.appendChild(script);
        };

        loadLib(libs, 0);
    }
}

export const compilerRegistry = new CompilerRegistry();

//load all available compilers
import JavaCompilers from '../compiler/java'
compilerRegistry.register(JavaCompilers);

import JavascriptCompilers from '../compiler/javascript'
compilerRegistry.register(JavascriptCompilers);

import PythonCompilers from '../compiler/python'
compilerRegistry.register(PythonCompilers);

import GLSLCompilers from '../compiler/glsl'
compilerRegistry.register(GLSLCompilers);


compilerRegistry.registerDOMLib(
    [
        Vue.$CodeBlock.baseurl+'js/d3/5.3.8/d3.v5.min.js',
        Vue.$CodeBlock.baseurl+'js/d3/5.3.8/helper.js'
    ], 
    'd3', 
    '5.13.4', 
    'D3',
    false,
    1000
)

compilerRegistry.registerDOMLib(
    [
        Vue.$CodeBlock.baseurl+'js/three.js/r0/three.min.js',
        Vue.$CodeBlock.baseurl+'js/three.js/r0/controls/OrbitControls.js',
        Vue.$CodeBlock.baseurl+'js/three.js/r0/controls/TrackballControls.js',
        Vue.$CodeBlock.baseurl+'js/three.js/r0/Detector.js',
        Vue.$CodeBlock.baseurl+'js/three.js/helper.r0.js'
    ], 
    '3js', 
    'r0', 
    'Three.JS',
    false,
    2000
)
export default compilerRegistry;

