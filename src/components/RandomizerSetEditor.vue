<template>
    <q-popup-proxy transition-show="flip-up" transition-hide="flip-down" @before-show="onShow">
        <!-- LineNumbers -->
        <div class="q-pa-md">
            <div class="row no-wrap q-pa-none">
                <div class="text-overline">{{ $t('RandomizerSetEditor.Caption', { nr: nr }) }}</div>
            </div>
            <div class="q-pl-md" v-for="tag in tagSet.values" v-bind:key="tag.tag">
                <q-input v-model="tag.value" :label="tag.tag" />
            </div>
        </div>
    </q-popup-proxy>
</template>

<script lang="ts">
import 'reflect-metadata'
import { Vue, Component, Prop, Watch } from 'vue-property-decorator'
import { IRandomizerSet } from '../lib/ICodeBlocks'

@Component
export default class RandomizerSetEditor extends Vue {
    @Prop({ required: true }) options!: any
    @Prop({ required: true }) tagSet!: IRandomizerSet
    @Prop({ required: true }) nr!: number

    get tags(): string[] {
        return this.tagSet.values.map(v => v.tag)
    }

    onShow(o) {
        this.tagSet.values = this.tagSet.values.filter(v => this.options.randomizer.knownTags.indexOf(v.tag) >= 0)
        this.options.randomizer.knownTags.forEach(t => {
            if (this.tagSet.values.find(v => v.tag == t) === undefined) {
                this.tagSet.values.push({
                    tag: t,
                    value: ''
                })
            }
        })
    }
}
</script>

<style></style>
