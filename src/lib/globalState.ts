import { reactive } from 'vue'
import { GlobalState } from '@/plugins/codeBlocks'
import { ErrorSeverity } from '@/lib/ICompilerRegistry'
import {
    getModelConsent,
    initializeAIModel,
    isBrowserCompatible,
    isAIModelReady,
    isModelAvailable,
    setModelConsent,
} from '@/plugins/aiCompletion'

const compilerState = reactive({
    globalStateHidden: true,
    globalStateMessage: '',
    runButtonForceHide: false,

    hideGlobalState() {
        this.displayGlobalState(null)
    },
    setAllRunButtons(what: boolean) {
        this.runButtonForceHide = !what
    },
    displayGlobalState(message: string | null) {
        this.globalStateHidden = message === null || message === undefined || message === ''
        this.globalStateMessage = message ? message : ''
    },
})

const appState = reactive(new GlobalState())

// ---------------------------------------------------------------------------
// AI completion — single coordinator across all CodeBlocks instances on page
// ---------------------------------------------------------------------------

const aiCompletionState = reactive({
    consentPending: false,
    isDownloading: false,
    downloadProgress: 0,
    downloadMessage: '',
})

async function _startAIDownload() {
    aiCompletionState.isDownloading = true
    aiCompletionState.downloadProgress = 0
    aiCompletionState.downloadMessage = ''
    try {
        await initializeAIModel((progress, message) => {
            aiCompletionState.downloadProgress = progress
            aiCompletionState.downloadMessage = message
            if (progress === 100) console.debug('[AI Completion] model ready')
        })
    } catch (e) {
        // Leave consent=true so the user is not prompted again — next page load retries automatically.
        // Clear stale WebLLM cache entries: on first-ever attempt, Vite's SPA fallback served HTML
        // for missing files with HTTP 200, and the Cache API stored that HTML. Deleting the cache
        // here ensures the next page load re-fetches the real files.
        try {
            // Clear Cache API caches (used for config/wasm with default backend)
            await caches.delete('webllm/config')
            await caches.delete('webllm/wasm')
        } catch {
            // caches API not available (non-secure context, etc.)
        }
        try {
            // Clear IndexedDB caches used by our indexeddb cacheBackend
            for (const name of ['webllm/config', 'webllm/wasm', 'webllm/model']) {
                await new Promise<void>((resolve) => {
                    const req = indexedDB.deleteDatabase(name)
                    req.onsuccess = () => resolve()
                    req.onerror = () => resolve()
                })
            }
        } catch {
            // ignore
        }
        console.error('[AI Completion] Download failed (will retry on next load):', e)
        aiCompletionState.downloadMessage = 'Download failed — will retry on next page load.'
    } finally {
        aiCompletionState.isDownloading = false
    }
}

/**
 * Call from each CodeBlocks instance on mount / when enableAICompletion changes.
 * Returns true if THIS caller should display the consent dialog.
 * Only the first instance that needs consent gets true; all others get false.
 */
async function checkAndInitAI(
    enableAICompletion: boolean,
    isEditMode: boolean,
    enableCompletionInViewMode: boolean
): Promise<boolean> {
    const log = (msg: string) => console.debug(`[AI] ${msg}`)

    if (!enableAICompletion) { log('skip: enableAICompletion=false'); return false }
    if (!isBrowserCompatible()) { log('skip: browser not compatible'); return false }
    if (!isEditMode && !enableCompletionInViewMode) { log('skip: not in edit mode and completion disabled in view mode'); return false }
    if (isAIModelReady()) { log('skip: model already ready'); return false }
    if (aiCompletionState.isDownloading) { log('skip: already downloading'); return false }
    if (aiCompletionState.consentPending) { log('skip: consent dialog already open'); return false }

    log('checking model availability…')
    const modelAvailable = await isModelAvailable()
    if (!modelAvailable) { log('skip: model files not found'); return false }

    const consent = getModelConsent()
    log(`consent state: ${consent}`)
    if (consent === false) { log('skip: user previously declined'); return false }

    if (consent === true) {
        log('consent given, starting download')
        if (!aiCompletionState.isDownloading) _startAIDownload()
        return false
    }

    // First caller claims the consent dialog (synchronous after last await — no race)
    if (aiCompletionState.consentPending) { log('skip: consent dialog claimed by another instance'); return false }
    log('showing consent dialog')
    aiCompletionState.consentPending = true
    return true
}

function acceptAIConsent() {
    setModelConsent(true)
    aiCompletionState.consentPending = false
    _startAIDownload()
}

function declineAIConsent() {
    setModelConsent(false)
    aiCompletionState.consentPending = false
}

// ---------------------------------------------------------------------------

function valOr(val: string | undefined, def: number): number {
    return val === undefined ? def : +val
}

export const globalState = {
    compilerState,
    appState,
    aiCompletion: {
        state: aiCompletionState,
        checkAndInit: checkAndInitAI,
        accept: acceptAIConsent,
        decline: declineAIConsent,
    },

    SEVERITY_ERROR: ErrorSeverity.Error,
    SEVERITY_WARNING: ErrorSeverity.Warning,
    VUE_APP_CODE_BLOCK_MAX_TIMEOUT: valOr(import.meta.env.VUE_APP_CODE_BLOCK_MAX_TIMEOUT, 800),
    VUE_APP_CONTINOUS_COMPILE_TIMEOUT: valOr(
        import.meta.env.VUE_APP_CONTINOUS_COMPILE_TIMEOUT,
        800
    ),
    VUE_APP_CODE_BLOCK_TIMEOUT: valOr(import.meta.env.VUE_APP_CODE_BLOCK_TIMEOUT, 150),
}
