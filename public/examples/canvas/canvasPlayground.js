export default {
    setupDOM() {
        //called when the site is first loaded.
        //this.canvasElement is a dive that can host the actual canvas element
        console.log('PLAyRun: setupDOM')
    },
    init() {
        //called when the site and all resources were loaded
        console.log('PLAyRun: init', this.canvasElement[0])
        canvasManager.allowMouseClickEvents()
        canvasManager.allowAllKeyboardEvents()
    },
    // beforeStart() {
    //     //called just before the java code is executed
    //     console.log('PLAyRUN: beforeStart')
    // },
    // whenFinished() {
    //     //called when the main method of the java code ended, the event loop will still continue to run at this point
    //     console.log('PLAyRUN: whenFinished')
    // },
    // afterStop() {
    //     //called after the java code stopped and the event loop ended, this is the last thing that happens during a run
    //     console.log('PLAyRUN: afterStop')
    // },
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
