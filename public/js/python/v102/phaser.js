let spriteSerial = 10000000
class Sprite {
    type
    mapGame
    uID
    row
    column
    removed

    constructor() {
        var args = [...arguments]
        this.removed = false

        let registerWithGame
        let uIDPrefix = 'sprite_'
        if (args.length === 4) {
            this.mapGame = args[0]
            registerWithGame = true
            this.type = args[1]
            this.row = args[2]
            this.column = args[3]
        } else if (args.length === 5) {
            this.mapGame = args[0]
            registerWithGame = args[1]
            this.type = args[2]
            this.row = args[3]
            this.column = args[4]
        } else if (args.length === 6) {
            uIDPrefix = args[0]
            this.mapGame = args[1]
            registerWithGame = args[2]
            this.type = args[3]
            this.row = args[4]
            this.column = args[5]
        }

        this.uID = uIDPrefix + spriteSerial++

        if (this.mapGame != null && registerWithGame) {
            //register needs to take care of Figure vs. Sprite
            this.mapGame.register(this)
        }
    }

    test() {
        console.log('sprite test')
    }
}

const PhaserInterop = {
    Sprite: Sprite,
}
