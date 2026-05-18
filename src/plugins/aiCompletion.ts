/**
 * AI Code Completion using WebLLM
 * Lightweight LLM inference directly in the browser with LOCAL resources only
 */

import { MLCEngine } from '@mlc-ai/web-llm'

const AI_MODEL_CONSENT_KEY = 'ai-model-consent'
const AI_MODEL_CACHE_KEY = 'ai-model-cache-info'

// Configure base URL for local resources
// Default to '/ai-models/' - adjust if your local models are served from a different path
let LOCAL_MODELS_BASE_URL = '/ai-models/'

/**
 * Set the base URL for locally hosted AI models
 * Call this during app initialization to point to your local model server
 * @param url Base URL where models are served (e.g., '/ai-models/' or 'http://exam-host/models/')
 */
export function setLocalModelsBaseURL(url: string): void {
    LOCAL_MODELS_BASE_URL = url.endsWith('/') ? url : url + '/'
}

/**
 * Get the currently configured base URL for local models
 */
export function getLocalModelsBaseURL(): string {
    return LOCAL_MODELS_BASE_URL
}

/**
 * Check if browser supports WebGPU (required for optimal performance)
 * Falls back to WebGL if WebGPU not available
 */
export function isBrowserCompatible(): boolean {
    return (
        typeof navigator !== 'undefined' &&
        (navigator.gpu !== undefined || // WebGPU support
            typeof WebGL2RenderingContext !== 'undefined') // WebGL2 fallback
    )
}

/**
 * Check if user has given consent to download the model
 * Returns the stored consent value or null if never asked
 */
export function getModelConsent(): boolean | null {
    try {
        const stored = localStorage.getItem(AI_MODEL_CONSENT_KEY)
        if (stored === null) {
            return null
        }
        return stored === 'true'
    } catch {
        return null
    }
}

/**
 * Store user's decision about model download
 */
export function setModelConsent(consent: boolean): void {
    try {
        localStorage.setItem(AI_MODEL_CONSENT_KEY, consent ? 'true' : 'false')
    } catch {
        console.warn('Failed to store AI model consent in localStorage')
    }
}

/**
 * Clear user's consent decision (for debugging or reset)
 */
export function clearModelConsent(): void {
    try {
        localStorage.removeItem(AI_MODEL_CONSENT_KEY)
        console.debug('[AI Completion] Cleared consent state')
    } catch {
        console.warn('Failed to clear AI model consent')
    }
}

/**
 * Check if model is already cached in browser
 */
export function isModelCached(): boolean {
    try {
        const cacheInfo = localStorage.getItem(AI_MODEL_CACHE_KEY)
        if (!cacheInfo) {
            return false
        }
        const info = JSON.parse(cacheInfo)
        return info.cached === true && Date.now() - info.timestamp < 30 * 24 * 60 * 60 * 1000 // 30 days
    } catch {
        return false
    }
}

/**
 * Mark model as cached
 */
export function markModelCached(): void {
    try {
        localStorage.setItem(
            AI_MODEL_CACHE_KEY,
            JSON.stringify({
                cached: true,
                timestamp: Date.now(),
            })
        )
    } catch {
        console.warn('Failed to mark AI model as cached')
    }
}

/**
 * Clear model cache info (called if cache is deleted)
 */
export function clearModelCacheInfo(): void {
    try {
        localStorage.removeItem(AI_MODEL_CACHE_KEY)
    } catch {
        // ignore
    }
}

// Global engine instance
let engine: any = null
let modelLoading: Promise<any> | null = null

/**
 * Initialize the AI model engine
 * This is called once and cached for subsequent requests
 *
 * @param onProgress Optional callback for download progress
 * @param modelId Optional model ID
 * @param modelLibUrl Optional URL to the compiled .wasm library for this model
 */
export async function initializeAIModel(
    onProgress?: (progress: number, message: string) => void,
    modelId: string = 'Qwen2.5-Coder-1.5B-Instruct-q4f32_1-MLC',
    modelLibUrl?: string
): Promise<void> {
    if (engine) {
        return
    }
    if (modelLoading) {
        return modelLoading
    }

    modelLoading = (async () => {
        try {
            // WebLLM requires absolute URLs — resolve relative paths against current page
            const abs = (path: string) => new URL(path, window.location.href).href
            const modelBase = abs(`${LOCAL_MODELS_BASE_URL}models/${modelId}/`)
            const libUrl = abs(
                modelLibUrl ?? `${LOCAL_MODELS_BASE_URL}models/${modelId}/model-lib.wasm`
            )

            const appConfig = {
                // Use IndexedDB instead of the default Cache API backend.
                // The Cache API silently fails for large binary files (>~50 MB) with
                // "Cache.add() encountered a network error" despite a 200 response.
                // IndexedDB stores arraybuffer data directly and handles 100 MB+ entries.
                cacheBackend: 'indexeddb' as const,
                model_list: [
                    {
                        model: modelBase,
                        model_id: modelId,
                        model_lib: libUrl,
                    },
                ],
            }

            engine = new MLCEngine({
                appConfig,
                initProgressCallback: (report) => {
                    const percent = Math.round(report.progress * 100)
                    onProgress?.(percent, report.text || `Loading… ${percent}%`)
                },
            })

            onProgress?.(0, 'Initializing AI model…')
            await engine.reload(modelId)

            markModelCached()
            onProgress?.(100, 'AI model ready')
        } catch (error) {
            engine = null
            modelLoading = null
            throw error
        }
    })()

    return modelLoading
}

/**
 * Get AI code completion for the given prefix
 * @param prefix The code prefix to complete
 * @param maxTokens Maximum tokens to generate (default: 50 for low latency)
 */
export async function getAICompletion(prefix: string, maxTokens: number = 50): Promise<string[]> {
    if (!engine) {
        throw new Error('AI model not initialized')
    }

    try {
        const reply = await engine.completions.create({
            prompt: prefix,
            max_tokens: maxTokens,
            stop: ['\n', ';', '{', '}'],
            stream: false,
        })

        const generated = reply.choices[0]?.text?.trim() ?? ''
        if (!generated) {
            return []
        }

        // Return first continuation as a single suggestion
        return [generated.split(/\n/)[0].trim()].filter((s) => s.length > 0 && s.length < 200)
    } catch (error) {
        console.error('Failed to get AI completion:', error)
        return []
    }
}

/**
 * Check if AI model is ready for use
 */
export function isAIModelReady(): boolean {
    return engine !== null
}

/**
 * Check if a specific model is available by fetching and parsing its mlc-chat-config.json.
 * Using a GET + JSON parse is the only reliable check: HEAD status codes and Content-Type
 * headers are unreliable when dev servers or proxies return HTML fallback pages with HTTP 200.
 * @param modelId Model ID to check
 */
export async function isModelAvailable(
    modelId: string = 'Qwen2.5-Coder-1.5B-Instruct-q4f32_1-MLC'
): Promise<boolean> {
    const configUrl = `${LOCAL_MODELS_BASE_URL}models/${modelId}/mlc-chat-config.json`
    try {
        const response = await fetch(configUrl)
        if (!response.ok) {
            console.debug(`[AI Model Check] Not found: ${configUrl} (${response.status})`)
            return false
        }
        const data = await response.json()
        const found = typeof data === 'object' && data !== null
        console.debug(`[AI Model Check] Model "${modelId}" ${found ? 'found' : 'invalid config'}`)
        return found
    } catch {
        // File missing, HTML fallback, or invalid JSON — all mean no model
        console.debug(`[AI Model Check] Model "${modelId}" not available at ${configUrl}`)
        return false
    }
}

/**
 * Unload the AI model to free up memory
 */
export function unloadAIModel(): void {
    if (engine) {
        try {
            engine.dispose?.()
        } catch {
            // ignore
        }
        engine = null
    }
}
