<template>
    <div v-show="editMode" class="blocksEditorPanelContainer" :style="`width:${width}px`">
        <div class="blocksEditorPanelLeft" v-show="block !== null">
            <Button class="expander" variant="ghost" size="icon" @click="onExpandClick">
                <component :is="expanded ? ChevronDown : ChevronUp" />
            </Button>
            <CodeBlock
                :block="saveBlock"
                :theme="themeForBlock(block)"
                mode=""
                :visibleLines="visibleLinesNow"
                :editMode="true"
                :muteReadyState="true"
                :isBookmarkPanel="true"
                namePrefix="panel_"
                @code-changed-in-edit-mode="onCodeChange"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, PropType, ref } from 'vue'
import CodeBlock from '@/components/CodeBlock.vue'
import { Button } from '@/shadcn/ui/button'
import { ChevronUp, ChevronDown } from 'lucide-vue-next'
import { BlockData } from '../lib/codeBlocksManager'
import { IBlockData, KnownBlockTypes, CodeExpansionType } from '../lib/ICodeBlocks'

interface IBlockDataExtended extends IBlockData {
    firstLine: number
    actualContent: string
    actualAltContent: string
}

const emptyBlockBuilder = (): IBlockDataExtended => {
    return {
        hasCode: false,
        type: KnownBlockTypes.BLOCKSTATIC,
        content: '',
        alternativeContent: '',
        noContent: true,
        id: -1,
        uuid: '',
        parentID: -2,
        expanded: true,
        codeExpanded: CodeExpansionType.AUTO,
        obj: null,
        version: '',
        readyCount: 0,
        errors: [],
        visibleLines: 'auto',
        hasAlternativeContent: false,
        shouldAutoreset: false,
        shouldReloadResources: false,
        generateTemplate: true,
        firstLine: 1,
        actualContent: '',
        actualAltContent: '',
        width: '100%',
        height: '200px',
        align: 'center',
        readonly: true,
        static: true,
        hidden: false,
        themeForCodeBlock: '',
        lineCountHint: -0,
        name: '',
        getThemeForBlock: (bl: any) => {
            return ''
        },
    }
}

const props = defineProps({
    editMode: {
        type: Boolean,
        required: true,
        default: false,
    },
    panelWidth: {
        type: Number,
        required: false,
        default: 400,
    },
    block: {
        type: null as unknown as PropType<BlockData | null>,
        default: null,
        required: true,
    },
    visibleLines: {
        type: [Number, String] as PropType<number | 'auto'>,
        default: 'auto',
    },
})

const expanded = ref(false)

const saveBlock = computed((): IBlockData => {
    if (
        props.block !== null &&
        props.block !== undefined &&
        props.block.content !== null &&
        props.block.content !== undefined
    ) {
        return props.block
    }
    return emptyBlockBuilder()
})

const visibleLinesNow = computed((): number | 'auto' => {
    if (props.visibleLines === 'auto') {
        return 'auto'
    }
    if (props.visibleLines <= 2) {
        return 2
    }
    return props.visibleLines
})

const width = computed(() => {
    if (expanded.value) {
        return 2 * props.panelWidth
    }
    return props.panelWidth
})

function onCodeChange(): void {}

function onExpandClick() {
    expanded.value = !expanded.value
}

function themeForBlock(bl: BlockData | null): string {
    if (bl === null || bl === undefined) {
        return ''
    }
    return bl.themeForCodeBlock
}
</script>

<style lang="sass" scoped>
div.blocksEditorPanelContainer
    position: fixed
    right: 0px
    top: 16px
    z-index: 10000
    transition: width 0.3s

div.blocksEditorPanelLeft
    padding: 24px 0px 8px 40px
    border-top-left-radius: 5px
    border-bottom-left-radius: 5px
    position: sticky
    display: block
    background-color: rgba(255, 255, 255, 0.8)
    box-shadow: 2px 3px 10px rgba(0, 0, 0, 0.3)

.expander
    position: absolute
    left: 0px
    top: 0px
    width: 24px
    height: 100%
    border-top-left-radius: 5px
    border-bottom-left-radius: 5px
    border-top-right-radius: 0px
    border-bottom-right-radius: 0px
    padding: 0px 0px 0px 0px
</style>
