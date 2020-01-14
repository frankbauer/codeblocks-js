<template>
  <div>
    <div class="blocklyContainer" ref="blocklyContainer">
    </div>
    <xml ref="blocklyToolbox" style="display:none" v-html="block.toolbox">
      
    </xml>
    <div v-if="editMode">
        <textarea :name="`block[${block.parentID}][${block.id}]`" v-html="block.content" style="display:block"></textarea>
        <div class="q-mt-lg text-subtitle2">{{$t('Blockly.CodePreviewLabel')}}</div>
        <CodeBlock 
                v-if="editMode" 
                :block="cmblock" 
                :theme="cmoptions.theme" 
                :mode="cmoptions.mode"
                :visibleLines="visibleLinesNow" 
                :editMode="false" 
                :muteReadyState="true"            
                namePrefix="preview_"
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
                namePrefix="toolbox_"
                @code-changed-in-edit-mode="onToolboxChange"/>
    </div>
  </div>
</template>

<script>
import Blockly from '../plugins/blockly.js';


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
        },
        'mode': {
            type: String,
            default: 'text/javascript'
        }
  },
  data(){
    return {
      workspace: null,
      tmpcode: ''
    }
  },  
  beforeDestroy(){
      if (this.block._oac){
        this.block.actualContent = this.block._oac;
        this.block._oac = undefined;
      }
  },
  mounted() {
      if (!this.block._oac){
        let self = this;
        this.block._oac = this.block.actualContent;
        this.block.actualContent = function(){
            return self.code;
        }.bind(this.block);
      }
      
    var options = this.$props.options || {};
    if (!options.toolbox) {
      options.toolbox = this.$refs["blocklyToolbox"];
    }
    if (!options.theme){
        const blockStyles = {
            "colour_blocks":{"colourPrimary":"#cf63cf","colourSecondary":"#c55ec5","colourTertiary":"#ba59ba"},
            "list_blocks":{"colourPrimary":"#5cb1d6","colourSecondary":"#57a8cb","colourTertiary":"#539fc1"},
            "logic_blocks":{"colourPrimary":"#ffab19","colourSecondary":"#f2a218","colourTertiary":"#e69a17"},
            "loop_blocks":{"colourPrimary":"#ffbf00","colourSecondary":"#f2b500","colourTertiary":"#e6ac00"},
            "math_blocks":{"colourPrimary":"#4c97ff","colourSecondary":"#488ff2","colourTertiary":"#4488e6"},
            "procedure_blocks":{"colourPrimary":"#ff6680","colourSecondary":"#f2617a","colourTertiary":"#e65c73"},
            "text_blocks":{"colourPrimary":"#bbbbca","colourSecondary":"#b2b2c0","colourTertiary":"#a8a8b6"},
            "variable_blocks":{"colourPrimary":"#59c059","colourSecondary":"#55b655","colourTertiary":"#50ad50"},
            "variable_dynamic_blocks":{"colourPrimary":"#0fbd8c","colourSecondary":"#0eb485","colourTertiary":"#0eaa7e"},
            "hat_blocks": {
                "colourPrimary": "330",
                "hat": "cap"
            }
        }

        const categoryStyles = {
            "colour_category": {"colour": blockStyles.colour_blocks.colourPrimary},
            "list_category": {"colour": blockStyles.list_blocks.colourPrimary},
            "logic_category": {"colour": blockStyles.logic_blocks.colourPrimary},
            "loop_category": {"colour": blockStyles.loop_blocks.colourPrimary},
            "math_category": {"colour": blockStyles.math_blocks.colourPrimary},
            "procedure_category": {"colour": blockStyles.procedure_blocks.colourPrimary},
            "text_category": {"colour": blockStyles.text_blocks.colourPrimary},
            "variable_category": {"colour": blockStyles.variable_blocks.colourPrimary},
            "variable_dynamic_category": {"colour": blockStyles.variable_dynamic_blocks.colourPrimary},
        }
        options.theme = new Blockly.Theme(blockStyles, categoryStyles)
    }
    options.renderer = 'minimalist'
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
           id: this.block.id,
           actualContent: () => {return this.block.toolbox}
       } 
    },
    visibleLinesNow(){
        if (!this.block.codeExpanded) return "5.2";
        return 'auto'
    },
    code(){
        if (this.workspace){
            if (this.mode == 'text/x-python' || this.mode == 'text/python' || this.mode == 'python'){
                return Blockly.Python.workspaceToCode(this.workspace);
            } else if (this.mode == 'text/x-java' || this.mode == 'text/java' || this.mode == 'java'){
                return Blockly.Java.workspaceToCode(this.workspace);
            }
            return Blockly.JavaScript.workspaceToCode(this.workspace);
        } else {
            return '';
        }
    },
    content:{
        get(){
            if (this.workspace){                
                let xml = Blockly.Xml.workspaceToDom(this.workspace);
                if (xml) {                    
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
                        Blockly.Xml.domToWorkspace(dom, this.workspace)
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
            this.block.content = this.content
        },
        onToolboxChange(newCode){
            if (this.workspace){                
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