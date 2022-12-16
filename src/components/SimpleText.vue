<template>
    <div>
        <div v-if="!editMode" v-html="previewValue" v-highlight="language"></div>
        <TipTap
            v-else
            :value="value"
            @input="updatedContentDefered"
            class="editor q-my-3"
            :name="name"
            :language="language"
            :scopUUID="scopeUUID"
            :editMode="editMode"
        />
    </div>
</template>

<script lang="ts">
import 'reflect-metadata'
import { Prop, Watch } from 'vue-property-decorator'
import { Vue, Options } from 'vue-class-component'
import TipTap from './TipTap.vue'
import BaseBlock from './BaseBlock.vue'

@Options({ components: { TipTap } })
export default class SimpleText extends BaseBlock {
    @Prop() language!: string
    @Prop({ default: '' }) value!: string
    @Prop({ default: '' }) name!: string
    @Prop({ default: '' }) scopeUUID!: string
    @Prop({ default: false }) editMode!: boolean
    @Prop({ default: '' }) previewValue!: string

    textUpdateTimer: number | null = null
    textUpdateStartTime: number = 0
    updatedContentDefered(newVal: string) {
        if (!this.editMode) {
            this.updatedContent(newVal)
            return
        }

        const now = new Date().getTime()

        //clear an existing update timeout
        if (this.textUpdateTimer !== null) {
            clearTimeout(this.textUpdateTimer)
            this.textUpdateTimer = null
        } else {
            this.textUpdateStartTime = now
        }

        const doIt = () => {
            this.textUpdateTimer = null
            this.updatedContent(newVal)
        }

        //did we wait for a maximum time? run
        if (now - this.textUpdateStartTime > process.env.VUE_APP_CODE_BLOCK_MAX_TIMEOUT) {
            doIt()
            return
        }
        this.textUpdateTimer = setTimeout(() => {
            doIt()
        }, process.env.VUE_APP_CODE_BLOCK_TIMEOUT)
    }

    updatedContent(v: string) {
        //console.log('Updating')
        //this.value = v
        this.$emit('input', v)
    }
}
</script>

<style lang="sass" scoped></style>
