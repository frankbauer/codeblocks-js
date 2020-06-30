<template>
    <div>
        <div v-if="!editMode" v-html="previewValue" v-highlight="language"></div>
        <TipTap
            v-else
            :value="value"
            @input="updatedContent"
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
import { Vue, Component, Prop, Watch } from 'vue-property-decorator'
import TipTap from './TipTap.vue'
import BaseBlock from './BaseBlock.vue'
@Component({ components: { TipTap } })
export default class SimpleText extends BaseBlock {
    @Prop() language!: string
    @Prop({ default: '' }) value!: string
    @Prop({ default: '' }) name!: string
    @Prop({ default: '' }) scopeUUID!: string
    @Prop({ default: false }) editMode!: boolean
    @Prop({ default: '' }) previewValue!: string

    updatedContent(v: string) {
        this.$emit('input', v)
    }
}
</script>

<style lang="sass" scoped></style>
