<template>
    <div></div>
</template>

<script lang="ts">
import 'reflect-metadata'
import { Vue, Component, Prop, Watch } from 'vue-property-decorator'
import Blockly from '@/plugins/blocklyEnv'

import { blocklyHelper } from '@/lib/BlocklyHelper'
import { BlockData } from '../lib/codeBlocksManager'
@Component
export default class BlocklyCustomBlocksEditor extends Vue {
    @Prop({ required: true }) block!: BlockData
}
</script>

<style lang="sass"></style>
