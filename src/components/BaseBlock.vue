<script lang="ts">
import 'reflect-metadata'
import { Prop, Watch } from 'vue-property-decorator'
import { Vue, Options } from 'vue-class-component'
import { BlockData } from '@/lib/codeBlocksManager'
@Options({})
export default class BaseBlock extends Vue {
    @Prop({ default: false }) muteReadyState!: boolean
    @Prop({ required: true }) block!: BlockData

    whenBlockIsReady() {
        if (this.muteReadyState) {
            return
        }
        this.block.readyCount++
        this.$emit('ready', this.block)
    }

    whenBlockIsDestroyed() {
        if (this.muteReadyState) {
            return
        }
        this.block.readyCount--
    }

    get readyWhenMounted() {
        return true
    }

    mounted() {
        if (this.readyWhenMounted) {
            this.whenBlockIsReady()
        }
    }

    beforeDestroy() {
        this.whenBlockIsDestroyed()
    }
}
</script>

<style></style>
