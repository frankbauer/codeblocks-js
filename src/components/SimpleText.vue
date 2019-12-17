<template>
    <div>
        <div v-if="!editMode" v-html="previewValue" v-highlight="language"></div>
        <TipTap v-else :value="value" @input="updatedContent" class="editor q-my-3" :name="name" :language="language" :scopUUID="scopeUUID" />
    </div>
</template>

<script>
import Vue from 'vue'
import TipTap from './TipTap'
import BaseBlock from './BaseBlock'
export default {
    extends: BaseBlock,
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
        'previewValue':{
            type:String,
            default: ""
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