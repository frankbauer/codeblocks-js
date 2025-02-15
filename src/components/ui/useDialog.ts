import { ref } from 'vue'

export interface DialogOptions {
  title: string
  message: string
  html?: boolean
  style?: string
  onOk?: () => void
  onCancel?: () => void
  onDismiss?: () => void
}

export function useDialog() {
  const isOpen = ref(false)
  const currentDialog = ref<DialogOptions | null>(null)

  const showDialog = (options: DialogOptions) => {
    currentDialog.value = options
    isOpen.value = true
    
    return {
      onOk(fn: () => void) {
        if (currentDialog.value) currentDialog.value.onOk = fn
        return this
      },
      onCancel(fn: () => void) {
        if (currentDialog.value) currentDialog.value.onCancel = fn
        return this
      },
      onDismiss(fn: () => void) {
        if (currentDialog.value) currentDialog.value.onDismiss = fn
        return this
      }
    }
  }

  const handleClose = () => {
    if (currentDialog.value?.onDismiss) {
      currentDialog.value.onDismiss()
    }
    isOpen.value = false
  }

  const handleOk = () => {
    if (currentDialog.value?.onOk) {
      currentDialog.value.onOk()
    }
    if (currentDialog.value?.onDismiss) {
      currentDialog.value.onDismiss()
    }
    isOpen.value = false
  }

  const handleCancel = () => {
    if (currentDialog.value?.onCancel) {
      currentDialog.value.onCancel()
    }
    if (currentDialog.value?.onDismiss) {
      currentDialog.value.onDismiss()
    }
    isOpen.value = false
  }

  return {
    isOpen,
    currentDialog,
    showDialog,
    handleClose,
    handleOk,
    handleCancel
  }
}