export {};

declare global {
    interface Window { 
      mountInElement(element:any):void; 
    }
    
    interface String {
      replaceAll(search:string, replacement:string) : string;
      replaceRec(pattern:string|RegExp, replacement:string)  : string;
    } 
}

declare module 'vue/types/vue' {
  interface VueConstructor {
    $hljs: any;
    $tagger: any;
    $CodeBlock: any;
    $SEVERITY_ERROR: number;
    $SEVERITY_WARNING: number;
  }
  interface Vue {
    $CodeBlock: any;
    $compilerState: any;
  }
}