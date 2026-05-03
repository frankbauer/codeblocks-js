export default {
    init() {},
    beforeStart() {
        console.log('PLAyRUN: beforeStart')
        setTimeout(() => {
            console.log('PLAyRUN: postMessage')
            this.runner.postMessage('hello', {})
        }, 1000)
        setTimeout(() => {
            console.log('PLAyRUN: postMessage')
            this.runner.postMessage('example', { flag: true, value: 123 })
        }, 2000)
    },
    whenFinished() {
        console.log('PLAyRUN: whenFinished')
    },
    update(txt, json) {
        console.log('PLAyRUN: update', txt, json)
        // Called when app finished running.
        // We could use this to show a final message or result if needed.
    },
    reset() {},
    onMessage(cmd, data) {
        console.log('PLAyRUN: Received message:', cmd, data)
        if (cmd === 'info') {
            // Synchronous reply to a @JSQuery
            this.runner.postMessage('infoReply', {
                queryId: data.queryId,
                json: JSON.stringify('Modernized DemoApp v1.0'),
            })
        }
    },
}
