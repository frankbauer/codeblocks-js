<template>
    <div class="floatingButton">
        <q-btn
            :color="color"
            text-color="black"
            @click="onClick"
            :icon="iconName"
            round
            size="xs"
        />
    </div>
</template>

<script lang="ts">
import 'reflect-metadata'
import { Prop, Emit } from 'vue-property-decorator'
import { Vue, Options } from 'vue-class-component'
import { BlockData, IBlockBookmarkPayload } from '@/lib/codeBlocksManager'
import { CodeBlocksGlobal } from '@/lib/global'

@Options({})
export default class CodeBlockButton extends Vue {
    @Prop({ required: true }) block!: BlockData
    @Prop({ default: false }) isBookmarkPanel!: boolean

    get color(): string {
        return this.isBookmarkPanel ? 'red-4' : 'amber'
    }

    get iconName(): string {
        if (this.isBookmarkPanel) {
            return 'close'
        }
        return this.bookmarked ? 'bookmark' : 'bookmark_border'
    }

    bookmarked: boolean = false
    bookmarkMe() {
        const data: IBlockBookmarkPayload = {
            uuid: this.block.appSettings.uuid,
            block: this.isBookmarkPanel ? null : this.block,
        }
        CodeBlocksGlobal.$GlobalEventHub.$emit('bookmark-block', data)
    }
    onClick() {
        this.bookmarkMe()
    }

    onBookmark(data: IBlockBookmarkPayload) {
        this.bookmarked =
            data.block === null || this.block === null ? false : this.block.uuid === data.block.uuid
    }

    mounted() {
        CodeBlocksGlobal.$GlobalEventHub.$on('bookmark-block', this.onBookmark)
    }

    beforeDestroy() {
        CodeBlocksGlobal.$GlobalEventHub.$off('bookmark-block')
    }
}
</script>

<style lang="sass" scoped>
.floatingButton
    position: absolute
    right: 8px
    top: 8px
    z-index:1020
</style>
