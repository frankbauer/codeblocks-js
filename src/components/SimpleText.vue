<template>
    <div>
        <div v-if="!editMode" v-html="previewValue" v-highlight="language"></div>
        <TipTap v-else :value="value" @input="updatedContent" class="editor q-my-3" :name="name" :language="language" :scopUUID="scopeUUID" />
    </div>
</template>

<script>
import Vue from 'vue'
import TipTap from './TipTap'
export default {
    name:"simpletext",
    components:{TipTap},
    props:{
        language:undefined,
        value:"",
        name:"",
        scopeUUID:'',
        'editMode': {
            type: Boolean,
            default: false
        },
        'tagSet':{
            type:Object,
            default: undefined
        }
    },
    computed:{
        previewValue(){
            if (this.tagSet!==undefined){
                return Vue.$tagger.replaceRandomTagsInString(this.value, this.tagSet)
            }
            return this.value;
        }
    },
    methods:{
        updatedContent(v){
            this.$emit('input', v);
        }
    }
}
</script>

<style lang="sass" scoped>
    
</style>