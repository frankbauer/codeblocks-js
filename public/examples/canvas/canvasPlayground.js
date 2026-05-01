export default {
    setupDOM() {
        //called when the site forst loaded
        //this.canvasElement is a dive that can host the actual canvas element
    },
    init() {
        //called when the site and all resources were loaded
    },
    beforeStart() {
        //called just before the java code is executed
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
        //called when the main method of the java code ended, the event loop will still continue to run at this point
        console.log('PLAyRUN: whenFinished')
    },
    update(txt, json) {
        console.log('PLAyRUN: update', txt, json)
        // Called when app finished running.
        // We could use this to show a final message or result if needed.
    },
    reset() {
        //called before a new app run is prepared
    },
    onMessage(cmd, data) {
        console.log('PLAyRUN: Received message:', cmd, data)
    },
}
