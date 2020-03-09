<template>
  
</template>

<script lang="ts">
import 'reflect-metadata'
import { Vue, Component, Prop } from 'vue-property-decorator'
@Component
export default class BaseBlock extends Vue {
    @Prop({default:false}) muteReadyState! : boolean;
    @Prop({required: true}) block! : any
    
    whenBlockIsReady(){
        if (this.muteReadyState) return;
        this.block.readyCount ++;
        this.$emit('ready', this.block);
    }
    whenBlockIsDestroyed(){
        if (this.muteReadyState) return;
        this.block.readyCount --;
    }

    get readyWhenMounted(){
        return true;
    }
    
    mounted(){
        if (this.readyWhenMounted)
            this.whenBlockIsReady();
    }

    beforeDestroy(){
        this.whenBlockIsDestroyed();
    }
}
</script>

<style>

</style>