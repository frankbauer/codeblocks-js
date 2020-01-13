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
            "colour_blocks":{"colourPrimary":"#d20992","colourSecondary":"#f6cee9","colourTertiary":"#bd0883"},
            "list_blocks":{"colourPrimary":"#3d349a","colourSecondary":"#d8d6eb","colourTertiary":"#372f8b"},
            "logic_blocks":{"colourPrimary":"#5ecd88","colourSecondary":"#dff5e7","colourTertiary":"#55b97a"},
            "loop_blocks":{"colourPrimary":"#e8c74a","colourSecondary":"#faf4db","colourTertiary":"#d1b343"},
            "math_blocks":{"colourPrimary":"#54bfeb","colourSecondary":"#ddf2fb","colourTertiary":"#4cacd4"},
            "procedure_blocks":{"colourPrimary":"#843bd5","colourSecondary":"#e6d8f7","colourTertiary":"#7735c0"},
            "text_blocks":{"colourPrimary":"#bbbbca","colourSecondary":"#f1f1f4","colourTertiary":"#a8a8b6"},
            "variable_blocks":{"colourPrimary":"#ee8845","colourSecondary":"#fce7da","colourTertiary":"#d67a3e"},
            "variable_dynamic_blocks":{"colourPrimary":"#fea865","colourSecondary":"#ffeee0","colourTertiary":"#e5975b"},
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