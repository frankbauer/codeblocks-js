<script setup lang="ts">
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shadcn/ui/dialog'
import CButton from '../ui/CButton.vue'
import { useDialog } from './useDialog'

const { isOpen, currentDialog, handleOk, handleCancel } = useDialog()
</script>

<template>
  <Dialog :open="isOpen" @update:open="handleCancel">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{{ currentDialog?.title }}</DialogTitle>
        <DialogDescription v-if="currentDialog?.html" v-html="currentDialog?.message" />
        <DialogDescription v-else>{{ currentDialog?.message }}</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <CButton @click="handleOk">OK</CButton>
        <CButton variant="secondary" @click="handleCancel">Cancel</CButton>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>