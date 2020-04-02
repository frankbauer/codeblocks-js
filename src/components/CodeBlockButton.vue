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
import { Vue, Component, Prop, Emit } from 'vue-property-decorator'
import { BlockData, IBlockBookmarkPayload } from '@/lib/codeBlocksManager'

@Component
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
            block: this.isBookmarkPanel ? null : this.block
        }
        Vue.$GlobalEventHub.$emit('bookmark-block', data)
    }
    onClick() {
        this.bookmarkMe()
    }

    onBookmark(block: BlockData | null) {
        this.bookmarked = this.block === block
    }

    mounted() {
        Vue.$GlobalEventHub.$on('bookmark-block', this.onBookmark)
    }

    beforeDestroy() {
        Vue.$GlobalEventHub.$off('bookmark-block')
    }
}
</script>

<style lang="sass" scoped>
.floatingButton
    position: absolute
    right: 8px
    top: 8px
    z-index:5000
</style>
