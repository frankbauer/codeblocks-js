<template>
  <div>
    <div class="blocklyContainer" ref="blocklyContainer">
    </div>
    <xml ref="blocklyToolbox" style="display:none">
      <slot></slot>
    </xml>
  </div>
</template>

<script>
import Blockly from 'blockly';
export default {
  name: 'Blockly',
  props: ['options'],
  data(){
    return {
      workspace: null
    }
  },
  mounted() {
    var options = this.$props.options || {};
    if (!options.toolbox) {
      options.toolbox = this.$refs["blocklyToolbox"];
    }
    this.workspace = Blockly.inject(this.$refs["blocklyContainer"], options);
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