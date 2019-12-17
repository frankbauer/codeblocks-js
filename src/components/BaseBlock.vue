<template>
  
</template>

<script>
export default {
    props:{
        'muteReadyState': false,
        'block': {
                required: true,
                type: Object
        }
    },
    methods:{
        whenBlockIsReady(){
            if (this.muteReadyState) return;
            this.block.readyCount ++;
            this.$emit('ready', this.block);
        },
        whenBlockIsDestroyed(){
            if (this.muteReadyState) return;
            this.block.readyCount --;
        }
    },
    readyWhenMounted:true,    
    mounted(){
        if (this.$options.readyWhenMounted)
            this.whenBlockIsReady();
    },
    beforeDestroy(){
        this.whenBlockIsDestroyed();
    }
}
</script>

<style>

</style>