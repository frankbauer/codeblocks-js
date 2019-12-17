import Vue from 'vue'

const legacyCodeTemplate = {
  prefix : 'let editors=[]; $(".CodeMirror").toArray().forEach(cm => editors[cm.CodeMirror.getTextArea().id] = cm.CodeMirror); return function(){ return {o:',
  postfix : '}.o}.call({})'
}
const v101CodeTemplate = {
  prefix : '"use strict"; return function(){ return {o:',
  postfix : '}.o}.call({})'
}

const jsErrorParser = function(e, templ){
  console.error(e);
  let line, column;
  if (e.line) line = e.line;
  else if (e.lineNumber) line = e.lineNumber;

  if (e.column) column = e.column;
  else if (e.columnNumber) column = e.columnNumber;

  if (line === undefined){
    let lines = e.stack.split("\n");
    if (lines.length>1) {
      const regex = /<anonymous>:(\d+):(\d+)/gm;
      let m;            
      if ((m = regex.exec(lines[1])) !== null) {
        line = Number(m[1])-1;
        column = Number(m[2])-1;
      }            
    }
  }   
  
  if (line !== undefined){
    line--;
    if (line==1) {
      if (templ!==undefined)
        column -= templ.prefix.length;        
    }
  }
  return {line:line, column:column, msg:e.message};
}
Vue.prototype.$jsErrorParser = jsErrorParser;



class ScriptBlock {
    constructor(script, version){
        this.err = []
        this.src = undefined;
        this.version = version;
        this.obj = undefined;
        this.fkt = undefined;
        this.rebuild(script);
    }

    requestsOriginalVersion(){
      return this.version=='100' || this.version=='' || this.version===undefined;
    }

    invalidate(){
      this.obj = undefined
    }
    
    rebuild(code) {
      if (code!==undefined){
        try {
          this.err = []
          console.log("!!! REBUILDING !!!");
          this.src = code

          //wrap the users code in a helper object, otherwise 
          //evaluating would fail if the code does not start in the first line

          //we also return a function to make and call (.call({})) it with a clean object 
          //to ensure that 'this' is will allways be in a defined state inside the users code
          if (this.requestsOriginalVersion()) {
            this.fkt = new Function(legacyCodeTemplate.prefix + code + legacyCodeTemplate.postfix); 
          } else
            this.fkt = new Function(v101CodeTemplate.prefix + code + v101CodeTemplate.postfix);           
          this.obj = this.fkt();
        } catch (e){
          this.pushError(e);
        }
      } else {
        this.obj = this.fkt();      
      }
    }

    pushError(e){      
      this.err.push(jsErrorParser(e));
    }

    init(canvasElement, scope){
      if (this.obj===undefined) return;
      try {
        console.log("!!! INIT !!!");   
        if (this.requestsOriginalVersion()) {     
          this.obj.init(canvasElement); 
        } else {
          let outputElement = undefined;
          if (scope===undefined || scope.length===0) scope = canvasElement.parents('.codeblocks')
          if (scope!==undefined) outputElement = scope.find('div.runner pre.output')
          this.obj.init(canvasElement, outputElement, scope); 
        }
      } catch(e) {
         this.pushError(e); 
      }
    }

    reset(canvasElement){
      if (this.obj && this.obj.reset && !this.requestsOriginalVersion()){
        this.obj.reset(canvasElement);
      }
    }

    update(outputObject, canvasElement){
      if (this.obj===undefined) return outputObject.output;
      try {        
        if (this.obj.update){  
          //console.log(this.obj.update.length, outputObject, this.obj);
          //this is the old behaviour  
          if (this.obj.update.length == 2 || this.requestsOriginalVersion()){              
            if (outputObject.processedOutput.type=='json') {
              console.log("!!! UPDATE (org, json) !!!");
              return this.obj.update(outputObject.processedOutput.json, canvasElement);
            } else {
              console.log("!!! UPDATE (org, text) !!!");
              return this.obj.update(outputObject.output, canvasElement);
            }
          } else {
            console.log("!!! UPDATE ("+this.version+")!!!");
            return this.obj.update(outputObject.processedOutput.text, outputObject.processedOutput.json, canvasElement, outputObject.outputElement);
          }
        }
      } catch(e) {
         this.pushError(e); 
      }
      return outputObject.initialOutput;
    }

    onParseError(initialOutput, parseError){
      if (this.obj===undefined) return false;
      try {
        if ( this.obj.onParseError){
          this.obj.onParseError(initialOutput, parseError);          
        } else {
          console.error(parseError);
          return false;
        }
      } catch(e) {
         this.pushError(e); 
         return false;
      }
      return true;
    }
    
  };

export default ScriptBlock;