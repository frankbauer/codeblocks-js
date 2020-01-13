<template>
  <div>
    <div class="blocklyContainer" ref="blocklyContainer">
    </div>
    <xml ref="blocklyToolbox" style="display:none" v-html="block.toolbox">
      
    </xml>
    <div v-if="editMode">
        <div class="q-mt-lg text-subtitle2">{{$t('Blockly.CodePreviewLabel')}}</div>
        <CodeBlock 
                v-if="editMode" 
                :block="cmblock" 
                :theme="cmoptions.theme" 
                :mode="cmoptions.mode"
                :visibleLines="visibleLinesNow" 
                :editMode="false" 
                :muteReadyState="true"            
                
                @code-changed-in-edit-mode="onCodeChange"/>
        <div class="q-mt-lg text-subtitle2">{{$t('Blockly.ToolboxLabel')}}</div>
        <CodeBlock 
                v-if="editMode" 
                :block="tbblock" 
                :theme="tboptions.theme" 
                :mode="tboptions.mode"
                :visibleLines="visibleLinesNow" 
                :editMode="this.editMode" 
                :muteReadyState="true"            
                
                @code-changed-in-edit-mode="onToolboxChange"/>
    </div>
  </div>
</template>

<script>
import Blockly from 'blockly';
import CodeBlock from './CodeBlock'
export default {
  components: {
    CodeBlock
  },
  name: 'Blockly',
  props: {
        'readonly':{
                type: Boolean,
                default: false
        },
        'options':{
            type:Object
        }, 
        'toolbox':{
            default:''
        },
        'block': {
            required: true,
            type: Object
        },
        'editMode': {
            type: Boolean,
            default: false
        },
        'tagSet':{
            type:Object,
            default: undefined
        },
        'theme': {
            type: String,
            default: 'base16-dark'
        }
  },
  data(){
    return {
      workspace: null,
      tmpcode: ''
    }
  },  
  mounted() {
    var options = this.$props.options || {};
    if (!options.toolbox) {
      options.toolbox = this.$refs["blocklyToolbox"];
    }
    this.workspace = Blockly.inject(this.$refs["blocklyContainer"], options);
    this.workspace.addChangeListener(this.onBlocklyChange.bind(this));
    this.content = this.block.content;
  },
  computed:{        
    cmoptions(){
        return {
                // codemirror options
                mode: this.$CodeBlock.mimeType('javascript'),
                theme: this.theme,
                lineNumbers: true,
                line: true,
                tabSize: 4,
                indentUnit: 4,
                autoCloseBrackets: true,
                readOnly: true,
                firstLineNumber: 1,
                gutters: ["diagnostics", "CodeMirror-linenumbers"]
            }
    },
    cmblock(){
       return {
           type: 'BLOCKLY',
           content: this.code,
           scopeUUID: this.block.scopeUUID,
           firstLine: 1,
           hidden: false,
           readonly: false,
           static: true,
           alternativeContent: this.code,
           parentID: this.block.parentID,
           id: this.block.id,
           actualContent: () => {return this.code}
       } 
    },
    tboptions(){
        return {
            mode: this.$CodeBlock.mimeType('xml'),
            theme: this.theme,
            lineNumbers: true,
            line: true,
            tabSize: 4,
            indentUnit: 4,
            readOnly: !this.editMode,
            firstLineNumber: 1,
            gutters: []
        }
    },
    tbblock(){
       return {
           type: 'XML',
           content: this.block.toolbox,
           scopeUUID: this.block.scopeUUID,
           firstLine: 1,
           hidden: false,
           readonly: false,
           static: true,
           alternativeContent: '',
           parentID: this.block.parentID,
           id: this.block.id+"-toolbox",
           actualContent: () => {return this.block.toolbox}
       } 
    },
    visibleLinesNow(){
        if (!this.block.codeExpanded) return "5.2";
        return 'auto'
    },
    code(){
        if (this.workspace){
            return Blockly.JavaScript.workspaceToCode(this.workspace);
        } else {
            return '';
        }
    },
    content:{
        get(){
            if (this.workspace){
                console.log(1)
                let xml = Blockly.Xml.workspaceToDom(this.workspace);
                if (xml) {
                    console.log(2)
                    return Blockly.Xml.domToText(xml);
                }
            } 
            return '';            
        },
        set(text){
            if (this.workspace && text && text != ''){
                try {
                    let dom = Blockly.Xml.textToDom(text);
                    if (dom){
                        Blockly.Xml.domToWorkspace(this.workspace, dom)
                    }
                } catch (e){
                    console.error("toDOM Error", e);
                }
            }
        }
    }
  },
  methods:{
        onCodeChange(newCode){
            if (this.editMode){
                
            }
        },
        onBlocklyChange(e){
            this.tmpcode = this.code
            console.log(this.cmblock)
            this.block.content = this.content
        },
        onToolboxChange(newCode){
            if (this.workspace){
                console.log("nCode", this.tbblock.content);
                this.workspace.updateToolbox('<xml>'+this.tbblock.content+'</xml>');
            }
        }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.blocklyContainer {
  height: 500px;
  width: 100%;
  text-align: left;
}
</style>