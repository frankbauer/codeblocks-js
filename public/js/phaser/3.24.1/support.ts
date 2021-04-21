class IsometricTile {
    phaser: any
    image: any
    constructor(phaser: any, x: number, y: number, type: string) {
        this.phaser = phaser

        this.image = phaser.add.image(x, y, type)
    }

    width(): number {
        return this.image.displayWidth
    }

    height(): number {
        return this.image.displayHeight
    }
}

class IsometricField {
    private tileWidth: number
    private tileHeight: number

    constructor(
        phaser: any,
        x: number,
        y: number,
        width: number,
        height: number,
        tileType: string,
        tileOverhang?: number
    ) {
        if (tileOverhang === undefined) {
            tileOverhang = 31
        }
        const tileSource = phaser.textures.get(tileType).getSourceImage()
        this.tileWidth = tileSource.width
        this.tileHeight = tileSource.height - tileOverhang

        const ox = this.tileWidth / 2
        const oy = (width - 1) * (this.tileHeight / 2)
        for (let r = 0; r < width; r++) {
            const roy = oy + (r + 1) * (this.tileHeight / 2)
            const rox = ox + r * (this.tileWidth / 2)
            for (let c = height - 1; c >= 0; c--) {
                new IsometricTile(
                    phaser,
                    rox + c * (this.tileWidth / 2),
                    roy - c * (this.tileHeight / 2),
                    tileType
                )
            }
        }
    }
}
