declare global {
  interface Window { 
    mountInElement(element:any):void; 
  }
  
  interface String {
    replaceAll(search:string, replacement:string) : string;
    replaceRec(pattern:string|RegExp, replacement:string)  : string;
  } 
}

String.prototype.replaceAll = function(search:string, replacement:string) : string {
  var target = this;
  return target.replace(new RegExp(search, 'g'), replacement);
};
String.prototype.replaceRec = function (pattern:string|RegExp, replacement:string)  : string {
  var newstr = this.replace(pattern, replacement);
  if (newstr == this)
      return newstr;
  return newstr.replaceRec(pattern, replacement);
};

import Vue from 'vue'
import 'reflect-metadata'
import './plugins/uuid'
import './plugins/quasar'
import './plugins/codemirror';
import './plugins/codeBlocks';
import './plugins/compilerState';
import './plugins/codemirror';
import './plugins/highlight'
import './plugins/tagger'
import './plugins/blockly'
//remove "noImplicitAny": false from tsconfig when this file goes ts
import CodeBlocksManager from './lib/codeBlocksManager';

Vue.config.productionTip = false
CodeBlocksManager.find(document).mount();

declare module 'vue/types/vue' {
  interface VueConstructor {
    $hljs: any;
    $tagger: any;
  }
}

window.mountInElement = function(element:any) :void{
  Vue.$hljs.$vue.processElements(element);
  Vue.$tagger.processElements(element);
  CodeBlocksManager.find(element).mount();
}