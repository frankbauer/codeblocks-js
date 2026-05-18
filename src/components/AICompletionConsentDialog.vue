<template>
    <Dialog :open="props.open" @update:open="onOpenChange">
        <DialogContent class="tw-sm:tw-max-w-md">
            <DialogHeader>
                <DialogTitle>{{ $t('AICompletion.Title') }}</DialogTitle>
                <DialogDescription>
                    {{ $t('AICompletion.Description') }}
                </DialogDescription>
            </DialogHeader>

            <div class="tw-space-y-4 tw-my-4">
                <div class="tw-p-3 tw-rounded-md tw-bg-blue-50 tw-border tw-border-blue-200">
                    <h4 class="tw-font-semibold tw-text-sm tw-text-blue-900 tw-mb-2">
                        {{ $t('AICompletion.Benefits') }}
                    </h4>
                    <ul class="tw-text-sm tw-text-blue-800 tw-space-y-1 tw-list-disc tw-pl-5">
                        <li>{{ $t('AICompletion.BenefitSmart') }}</li>
                        <li>{{ $t('AICompletion.BenefitFast') }}</li>
                        <li>{{ $t('AICompletion.BenefitPrivate') }}</li>
                    </ul>
                </div>

                <div class="tw-p-3 tw-rounded-md tw-bg-amber-50 tw-border tw-border-amber-200">
                    <h4 class="tw-font-semibold tw-text-sm tw-text-amber-900 tw-mb-2">
                        {{ $t('AICompletion.Note') }}
                    </h4>
                    <p class="tw-text-sm tw-text-amber-800">
                        {{ $t('AICompletion.NoteText') }}
                    </p>
                </div>
            </div>

            <DialogFooter class="tw-flex tw-gap-2">
                <Button variant="outline" @click="handleDecline">
                    {{ $t('AICompletion.NotNow') }}
                </Button>
                <Button @click="handleAccept">
                    {{ $t('AICompletion.Accept') }}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>

<script setup lang="ts">
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/shadcn/ui/dialog'
import { Button } from '@/shadcn/ui/button'

interface Props {
    open: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
    'update:open': [boolean]
    accept: []
    decline: []
}>()

const onOpenChange = (open: boolean) => {
    if (!open) emit('update:open', false)
}

const handleAccept = () => {
    emit('accept')
    // Parent closes via v-if — do NOT emit update:open here or it triggers the decline handler
}

const handleDecline = () => {
    emit('decline')
    emit('update:open', false)
}
</script>
