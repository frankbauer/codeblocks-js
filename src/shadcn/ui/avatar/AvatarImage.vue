<script setup lang="ts">
import type { AvatarImageProps } from 'reka-ui'
import { AvatarImage } from 'reka-ui'

const props = defineProps<AvatarImageProps>()
</script>

<template>
    <AvatarImage v-bind="props" class="tw-h-full tw-w-full tw-object-cover">
        <slot />
    </AvatarImage>
</template>
