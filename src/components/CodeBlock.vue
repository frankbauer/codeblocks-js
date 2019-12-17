<template>
    <div :class="`codeblock block-${typeName}`">        
        <codemirror ref="codeBox" :value="code" :options="options" :class="`accqstXmlInput noRTEditor ${boxClass}`" @ready="onCodeReady"
        @focus="onCodeFocus" @input="onCodeChange" :name="`block[${block.parentID}][${block.id}]`" :id="`teQ${block.parentID}B${block.id}`" :data-question="block.parentID">
        </codemirror>   

        <div v-show="hasAlternativeContent" v-if="editMode">
            <div class="q-mt-lg text-subtitle2">{{$t('CodeBlock.Initial_Content')}}</div>
            <codemirror ref="altBox" :value="altCode" :options="altOptions" :class="`accqstXmlInput noRTEditor ${boxClass}`" @ready="onAltCodeReady"
        @focus="onAltCodeFocus" @input="onAltCodeChange" :name="`alt_block[${block.parentID}][${block.id}]`">
            </codemirror> 
        </div>
    </div>
</template>

<script>
    import codemirror from 'vue-codemirror'
    import 'codemirror/lib/codemirror.css'

    //themes
    import 'codemirror/theme/solarized.css'
    import 'codemirror/theme/base16-dark.css'
    import 'codemirror/theme/base16-light.css'
    import 'codemirror/theme/duotone-dark.css'
    import 'codemirror/theme/duotone-light.css'
    import 'codemirror/theme/xq-dark.css'
    import 'codemirror/theme/xq-light.css'
    import 'codemirror/theme/blackboard.css'
    import 'codemirror/theme/midnight.css'
    import 'codemirror/theme/neo.css'
    import 'codemirror/theme/mbo.css'
    import 'codemirror/theme/mdn-like.css'

    //languages
    import 'codemirror/mode/clike/clike.js'
    import 'codemirror/mode/fortran/fortran.js'
    import 'codemirror/mode/javascript/javascript.js'
    import 'codemirror/mode/perl/perl.js'
    import 'codemirror/mode/python/python.js'
    import 'codemirror/mode/r/r.js'
    import 'codemirror/mode/ruby/ruby.js'
    import '../lib/glsl/glsl'

    //plugins
    import 'codemirror/addon/edit/closebrackets.js'

    //helper to create tooltips at runtime
    import Vue from 'vue'
    import ErrorTip from './ErrorTip.vue'
    const ErrorTipCtor = Vue.extend(ErrorTip)

    export default {
        name: 'CodeBlock',
        props: {
            'readonly':{
                type: Boolean,
                default: false
            },
            'visibleLines': {
                default: 'auto'
            },
            'theme': {
                type: String,
                default: 'base16-dark'
            },
            'mode': {
                type: String,
                default: 'text/javascript'
            },
            'block': {
                required: true,
                type: Object,
                validator: function (b) {
                    if (b.content === undefined) return false;
                    if (b.firstLine === undefined) return false;
                    return true;
                }
            },
            'editMode': {
                type: Boolean,
                default: false
            },
            'tagSet':{
                type:Object,
                default: undefined
            }
        },
        methods: {
            clearTagMarkers(){
                let allMarks = this.codemirror.getDoc().getAllMarks();
                allMarks.forEach(e => {
                    if (e.className == Vue.$tagger.className.rnd || e.className == Vue.$tagger.className.templ){
                        e.clear()
                    }
                })

                if (this.altcodemirror){
                    allMarks = this.altcodemirror.getDoc().getAllMarks();
                    allMarks.forEach(e => {
                        if (e.className == Vue.$tagger.className.rnd || e.className == Vue.$tagger.className.templ){
                            e.clear()
                        }
                    })
                }
            },
            clearErrorDisplay(){
                let allMarks = this.codemirror.getDoc().getAllMarks();
                //console.log("marks", this.block.type, allMarks)
                allMarks.forEach(e => {
                    if (e.className == 'red-wave'){
                        e.clear()
                    }
                })

                this.codemirror.getDoc().clearGutter('diagnostics');                
            },
            onCodeReady(editor) {
                //we need this for StudON to make sure tinyMCE is not taking over :D
                this.codemirror.display.input.textarea.className = "noRTEditor"                
                this.$refs.codeBox.$el.querySelectorAll('textarea[name]').forEach(el => {
                    el.className = (el.className + " accqstXmlInput noRTEditor").trim();
                    el.id = this.$refs.codeBox.$el.id;
                    el.setAttribute('data-question', this.block.parentID);
                    el.setAttribute('data-blocktype', this.iliasTypeNr);
                })
                this.updateDiagnosticDisplay();
                this.onCodeChange(this.block.content);                
            },
            onAltCodeReady(editor) {
                console.log("READY")
                //we need this for StudON to make sure tinyMCE is not taking over :D
                this.codemirror.display.input.textarea.className = "noRTEditor"                
                this.$refs.altBox.$el.querySelectorAll('textarea[name]').forEach(el => {
                    el.className = (el.className + " accqstXmlInput noRTEditor").trim();
                })
                this.$nextTick(()=>{
                    this.onAltCodeChange(this.block.alternativeContent); 
                    this.updateTagDisplay();      
                    this.updateHeight()            
                })
            },
            onCodeFocus(editor) {

            },
            onAltCodeFocus(editor) {

            },
            onCodeChange(newCode) {
                const tb = this.$refs.codeBox.$el.querySelector('textarea[name]');
                tb.value = newCode
                
                this.block.content = newCode
                this.updateTagDisplay();
                if (this.editMode) this.$emit("code-changed-in-edit-mode", undefined);
            },
            onAltCodeChange(newCode) {
                const tb = this.$refs.altBox.$el.querySelector('textarea[name]');
                tb.value = newCode
                
                this.block.alternativeContent = newCode
                this.updateTagDisplay();                
            },
            updateHeight(){
                if (this.visibleLines === 'auto') {
                    this.codemirror.setSize('height', 'auto');
                    if (this.altcodemirror) 
                        this.altcodemirror.setSize('height', 'auto');
                } else {
                    this.codemirror.setSize(null, Math.round(20 * Math.max(1, this.visibleLines)) + 9);
                    if (this.altcodemirror) 
                        this.altcodemirror.setSize(null, Math.round(20 * Math.max(1, this.visibleLines)) + 9);
                }
            },
            replaceTemplateTags(o){
                if (!this.editMode) return;
                if (!o.scopeUUID != this.block.scopeUUID) return
                this.block.content = Vue.$tagger.replaceTemplateTagInString(this.block.content, o.name, o.newValue)
            },
            updateTagDisplay(){
                if (!this.editMode) return;

                this.clearTagMarkers();
                Vue.$tagger.getMarkers(this.block.content).forEach(m => {
                    this.codemirror.getDoc().markText(
                        m.start, 
                        m.end, 
                        {
                            className:Vue.$tagger.className[m.type],
                            inclusiveLeft:true,
                            inclusiveRight:true,
                            title:m.name,
                            startStyle:'tag-mark-start',
                            endStyle:'tag-mark-end'
                        }
                    );
                })
                this.$nextTick(()=>Vue.$tagger.hookClick(this.$refs.codeBox.$el, this.block.scopeUUID)) 

                if (this.altcodemirror){
                    Vue.$tagger.getMarkers(this.block.alternativeContent).forEach(m => {
                        this.altcodemirror.getDoc().markText(
                            m.start, 
                            m.end, 
                            {
                                className:Vue.$tagger.className[m.type],
                                inclusiveLeft:true,
                                inclusiveRight:true,
                                title:m.name,
                                startStyle:'tag-mark-start',
                                endStyle:'tag-mark-end'
                            }
                        );
                    })

                    this.$nextTick(()=>Vue.$tagger.hookClick(this.$refs.altBox.$el, this.block.scopeUUID)) 
                }             
            },
            updateDiagnosticDisplay(){
                const val = this.errors;
                if (val!==undefined){
                    this.clearErrorDisplay();                        
                    
                    const first = this.block.firstLine;
                    val.forEach(error => {
                        if (error.start.column>=0){
                            //console.log("squiggle", this.block.type);
                            //put a squigly line as code marker 
                            this.codemirror.getDoc().markText(
                                {line:error.start.line-first, ch:error.start.column}, 
                                {line:error.end.line-first, ch:error.end.column}, 
                                {
                                    className:'red-wave',
                                    inclusiveLeft:true,
                                    inclusiveRight:true,
                                    title:error.message                
                                }
                            );
                        }

                        //read existing gutter marker or create a new one
                        let info = this.codemirror.getDoc().lineInfo(error.start.line-first);
                        let element = info && info.gutterMarkers ? info.gutterMarkers['diagnostics'].$component : null;
                        if (element == null) {
                            //console.log("Gutter", this.block.type, error.start.line, error.message, first);
                            element = document.createElement("span");

                            //place the updated element
                            this.codemirror.getDoc().setGutterMarker(error.start.line-first, "diagnostics", element);

                            element.$component = new ErrorTipCtor({
                                propsData: {
                                    errors: [],
                                    severity: error.severity 
                                }
                            }).$mount(element);

                            element = element.$component;
                        }

                        //make sure we use the proper class for the given severity.
                        //We allways choose the maximum severity for each marking
                        element.severity = Math.max(error.severity, element.severity); 

                        //Build the hint text
                        if (element.errors.indexOf(error)==-1){
                            element.errors.push(error);
                        }                       
                    });
                } else {
                    this.clearErrorDisplay();
                }            
            }
        },
        computed: {
            hasAlternativeContent(){
                return this.block.hasAlternativeContent && this.typeName == 'block'
            },
            errors() {
                return this.block.errors;
            },
            randomizerActive(){
                return  this.tagSet !== undefined;
            },
            boxClass() {
                let cl = "";
                if (this.block.hidden && !this.editMode) cl += "hiddenBox "
                if (this.block.readonly || this.readonly) cl += "readonlyBox "
                if (this.block.static) cl += "staticBox "                
                return cl;
            },
            iliasTypeNr(){
                const t = this.typeName;
                if (t=='text') return 0;                
                if (t=='block-static') return 1;                
                if (t=='block') return 2;
                if (t=='block-hidden') return 3;
                if (t=='playground') return 4;
                return -1;
            },
            typeName(){
                let s = this.block.type.toLowerCase()
                if (this.block.hidden) s += '-hidden'
                if (this.block.static) s += '-static'
                return s;
            },
            altCode(){
                return this.block.alternativeContent;
            },
            code() {
                if (!this.editMode) return this.block.actualContent()                   
                return this.block.content;
            },
            options() {
                return {
                    // codemirror options
                    mode: this.mode,
                    theme: this.theme,
                    lineNumbers: true,
                    line: true,
                    tabSize: 4,
                    indentUnit: 4,
                    autoCloseBrackets: true,
                    readOnly: !this.editMode && (this.block.readonly || this.block.static || this.block.hidden || this.readonly),
                    firstLineNumber: this.block.firstLine,
                    gutters: ["diagnostics", "CodeMirror-linenumbers"]
                }
            },
            altOptions() {
                let o = this.options;
                o.firstLineNumber = 1
                return o;
            },
            codemirror() {
                return this.$refs.codeBox.codemirror
            },
            altcodemirror() {
                if (this.$refs.altBox===undefined) return undefined
                return this.$refs.altBox.codemirror
            }
        },
        watch: {
            visibleLines: function (val) {
                this.updateHeight();
            },
            errors: function(val){
                this.updateDiagnosticDisplay();
            }
        },
        created(){
            this.$options.readyWhenMounted = false;
        },
        mounted() {            
            this.updateHeight();            

            if (this.editMode) {
                console.log("Attach")
                const buildIt = () => {
                    console.log("EMIT");
                    this.$emit("build");                              
                };

                this.codemirror.addKeyMap({
                    "Cmd-B": function(cMirror) { buildIt() },
                    "Ctrl-B": function(cMirror) { buildIt() }
                });    

                this.codemirror.addKeyMap({
                    "Tab": function(cMirror) {
                        cMirror.execCommand("insertSoftTab");              
                    }
                });    
            } 
            
            Vue.$tagger.$on('replace-template-tag', this.replaceTemplateTags);
            this.updateTagDisplay();   
        },
        beforeDestroy(){
            Vue.$tagger.$off('replace-template-tag', this.replaceTemplateTags);
        }
    }
</script>
<style scoped lang="sass">
    .hiddenBox 
        display: none !important
    .staticBox 
        opacity: 0.8 
        filter: grayscale(20%)
</style>