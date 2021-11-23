/// <reference path="./types/phaser.d.ts" />

const animNamesByDir = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW']
const sheetIndex = [0, 1, 3, 5, 4, 6, 7, 2]

interface GdIMove {
    path: any
    t: number
    inc: number
    last: {
        p: any
        d: number
    }
}

interface GameResource {
    key: string
    uri: string
}

interface GameSheetResource extends GameResource {
    frameConfig: Phaser.Types.Loader.FileTypes.ImageFrameConfig
    directional: boolean
    repeat: number
    shiftY: number
}

interface SpriteConfig {
    uri: string
    repeat: number
    frameConfig: Phaser.Types.Loader.FileTypes.ImageFrameConfig
    shiftY: number
}

interface MapConfig {
    type: 'isometric'
    offsetX: number
    offsetY: number
    columns: number
    rows: number
    tileType: string
    tileOverhang?: number
}

interface AnimatedSpriteConfig {
    type: 'walking' | 'animated'
    x: number
    y: number
    originX?: number
    originY?: number
    texture: string
    frame?: string | number
    speed?: number
    tile?: IMapTile
    shiftY?: number
}

interface FigureConfig {
    type: string
    big: boolean
    loaded: boolean
}

interface TileConfig {
    uri: string
}

class Tiles {
    public static readonly Checkers: TileConfig = { uri: 'resources/tile/checker.png' }
    public static readonly Gras: TileConfig = { uri: 'resources/tile/gras.png' }
}

class Sprites {
    public static random(type: SpriteConfig[]): SpriteConfig {
        return type[Math.floor(Math.random() * Sprites.Snow.length)]
    }
    public static readonly Fire: SpriteConfig[] = [
        {
            uri: 'resources/tile/fire_00.png',
            repeat: 0,
            frameConfig: {
                frameWidth: 90,
                frameHeight: 83,
                startFrame: 0,
                endFrame: 251,
            },
            shiftY: 0,
        },
    ]

    public static readonly Snow: SpriteConfig[] = [0, 1, 2, 3].map((nr) => {
        const shift = [-8, 3, -8, 3]
        return {
            uri: `resources/tile/snow_${('00' + nr).slice(-2)}.png`,
            repeat: -1,
            frameConfig: {
                frameWidth: 90,
                frameHeight: 83,
                startFrame: 0,
                endFrame: 125,
            },
            shiftY: shift[nr],
        }
    })

    public static readonly Snowman: SpriteConfig[] = [0, 1, 2, 3, 4].map((nr) => {
        return {
            uri: `resources/tile/snowman_${('00' + nr).slice(-2)}.png`,
            repeat: 0,
            frameConfig: {
                frameWidth: 90,
                frameHeight: 53,
                startFrame: 0,
                endFrame: 59,
            },
            shiftY: 0,
        }
    })

    public static readonly HolidaySnowman: SpriteConfig[] = [0, 1, 2, 3, 4, 5].map((nr) => {
        return {
            uri: `resources/tile/snowman_xmas_${('00' + nr).slice(-2)}.png`,
            repeat: 0,
            frameConfig: {
                frameWidth: 90,
                frameHeight: 53,
                startFrame: 0,
                endFrame: 59,
            },
            shiftY: 0,
        }
    })

    public static readonly Hut: SpriteConfig[] = [0, 1, 2, 3, 4, 5].map((nr) => {
        return {
            uri: `resources/tile/huts_${('00' + nr).slice(-2)}.png`,
            repeat: 0,
            frameConfig: {
                frameWidth: 120,
                frameHeight: 64,
                startFrame: 0,
                endFrame: 0,
            },
            shiftY: 0,
        }
    })

    public static readonly Stones: SpriteConfig[] = [
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
    ].map((nr) => {
        return {
            uri: `resources/tile/stones_${('00' + nr).slice(-2)}.png`,
            repeat: 0,
            frameConfig: {
                frameWidth: 120,
                frameHeight: 64,
                startFrame: 0,
                endFrame: 0,
            },
            shiftY: 0,
        }
    })

    public static readonly Trees: SpriteConfig[] = [
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
    ].map((nr) => {
        return {
            uri: `resources/tile/trees_${('00' + nr).slice(-2)}.png`,
            repeat: 0,
            frameConfig: {
                frameWidth: 120,
                frameHeight: 64,
                startFrame: 0,
                endFrame: 0,
            },
            shiftY: 0,
        }
    })
}

class Figures {
    public static readonly Blue: FigureConfig = {
        type: 'blue',
        big: false,
        loaded: false,
    }
    public static readonly BlueLoaded: FigureConfig = {
        type: 'blue',
        big: false,
        loaded: true,
    }
    public static readonly BigBlue: FigureConfig = {
        type: 'blue',
        big: true,
        loaded: false,
    }
    public static readonly BigBlueLoaded: FigureConfig = {
        type: 'blue',
        big: true,
        loaded: true,
    }

    public static readonly Green: FigureConfig = {
        type: 'blue',
        big: false,
        loaded: false,
    }
    public static readonly GreenLoaded: FigureConfig = {
        type: 'blue',
        big: false,
        loaded: true,
    }
    public static readonly BigGreen: FigureConfig = {
        type: 'blue',
        big: true,
        loaded: false,
    }
    public static readonly BigGreenLoaded: FigureConfig = {
        type: 'green',
        big: true,
        loaded: true,
    }

    public static readonly Snowman: FigureConfig = {
        type: 'snowman',
        big: false,
        loaded: false,
    }
    public static readonly SnowmanLoaded: FigureConfig = {
        type: 'snowman',
        big: false,
        loaded: true,
    }
    public static readonly BigSnowman: FigureConfig = {
        type: 'snowman',
        big: true,
        loaded: false,
    }
    public static readonly BigSnowmanLoaded: FigureConfig = {
        type: 'snowman',
        big: true,
        loaded: true,
    }

    public static readonly HolidaySnowman: FigureConfig = {
        type: 'snowman_xmas',
        big: false,
        loaded: false,
    }
    public static readonly HolidaySnowmanLoaded: FigureConfig = {
        type: 'snowman_xmas',
        big: false,
        loaded: true,
    }
    public static readonly BigHolidaySnowman: FigureConfig = {
        type: 'snowman_xmas',
        big: true,
        loaded: false,
    }
    public static readonly BigHolidaySnowmanLoaded: FigureConfig = {
        type: 'snowman_xmas',
        big: true,
        loaded: true,
    }

    public static readonly Grinch: FigureConfig = {
        type: 'grinch',
        big: false,
        loaded: false,
    }
    public static readonly GrinchLoaded: FigureConfig = {
        type: 'grinch',
        big: false,
        loaded: true,
    }
    public static readonly BigGrinch: FigureConfig = {
        type: 'grinch',
        big: true,
        loaded: false,
    }
    public static readonly BigGrinchLoaded: FigureConfig = {
        type: 'grinch',
        big: true,
        loaded: true,
    }
}

class BaseAnimatedSprite {
    public readonly sprite: Phaser.GameObjects.Sprite
    protected readonly game: Game
    protected base_v: number = 5
    protected animKey: string

    protected constructor(
        game: Game,
        sprite: Phaser.GameObjects.Sprite,
        config: AnimatedSpriteConfig
    ) {
        this.sprite = sprite
        this.game = game
        this.animKey = config.texture
    }

    setOrigin(x: number, y: number) {
        this.sprite.setOrigin(x, y)
    }

    setBaseSpeed(bsp: number) {
        this.base_v = bsp
    }

    remove() {
        this.game.removeSprite(this)
    }

    update(time: number, delta: number) {}
}

class AnimatedSprite extends BaseAnimatedSprite {
    public onFinishedAnimation: (sprite: AnimatedSprite) => void
    protected constructor(
        game: Game,
        sprite: Phaser.GameObjects.Sprite,
        config: AnimatedSpriteConfig
    ) {
        super(game, sprite, config)
        this.onFinishedAnimation = () => {}
        sprite.on('animationcomplete', this.finishedAnimation, this)
    }

    static add(game: Game, scene: Phaser.Scene, config: AnimatedSpriteConfig): AnimatedSprite {
        const s = scene.add.sprite(config.x, config.y, config.texture, config.frame)
        const shiftY = config.shiftY ? config.shiftY : 0
        const oy =
            (config.originY
                ? config.originY
                : config.tile
                ? (config.y - config.tile.bottom.y) / s.height + 1
                : 0.5) +
            shiftY / s.height
        const ox = config.originX ? config.originX : 0.5
        s.setOrigin(ox, oy)

        // scene.add.circle(config.x, config.y, 2, 0x6666ff)
        // scene.add.rectangle(
        //     s.getBounds().centerX,
        //     s.getBounds().centerY,
        //     s.getBounds().width,
        //     s.getBounds().height,
        //     0x6666ff,
        //     0.3
        // )
        // console.log(config.x, config.y)
        // console.log(config.tile?.bottom)
        // console.log(config.tile?.center)
        // console.log(
        //     oy,
        //     game.map?.tileWidth,
        //     game.map?.tileHeight,
        //     game.map?.tileOverhang,
        //     s.width,
        //     s.height,
        //     s.getBounds()
        // )

        const sprite = new AnimatedSprite(game, s, config)
        if (config.speed) {
            sprite.setBaseSpeed(config.speed)
        }
        return sprite
    }

    finishedAnimation() {
        this.onFinishedAnimation(this)
    }

    play() {
        this.sprite.anims.play(`${this.animKey}`, true)
    }

    stop() {
        this.sprite.anims.stop()
    }
}

class WalkingSprite extends BaseAnimatedSprite {
    private move: GdIMove | undefined = undefined

    public onEnterTile: (tile: IMapTile, figure: WalkingSprite) => void
    public onLeaveTile: (tile: IMapTile, figure: WalkingSprite) => void
    public onFinishedWalking: (figure: WalkingSprite) => void

    private constructor(
        game: Game,
        sprite: Phaser.GameObjects.Sprite,
        config: AnimatedSpriteConfig
    ) {
        super(game, sprite, config)

        this.onEnterTile = () => {}
        this.onLeaveTile = () => {}
        this.onFinishedWalking = () => {}

        this.updateCurrentTile()
    }

    static add(game: Game, scene: Phaser.Scene, config: AnimatedSpriteConfig): WalkingSprite {
        const s = scene.add.sprite(config.x, config.y, config.texture, config.frame)
        const shiftY = config.shiftY ? config.shiftY : 0
        const oy = (config.originY ? config.originY : 36 / 64) + shiftY / s.height
        const ox = config.originX ? config.originX : 37 / 76
        s.setOrigin(ox, oy)

        const sprite = new WalkingSprite(game, s, config)
        if (config.speed) {
            sprite.setBaseSpeed(config.speed)
        }
        return sprite
    }

    moveToTile(c: number, r: number) {
        const tile = this.game.map?.getTile(c, r)
        if (tile) {
            const p = tile.center
            this.moveTo(p.x, p.y)
        }
    }

    moveTo(x: number, y: number) {
        this.sprite.x = x
        this.sprite.y = y

        this.updateCurrentTile()
    }

    walkToTile(c: number, r: number) {
        const tile = this.game.map?.getTile(c, r)
        if (tile) {
            const p = tile.center
            this.walkTo(p.x, p.y)
        }
    }

    walkTo(x: number, y: number) {
        const path = new Phaser.Curves.Path(this.sprite.x, this.sprite.y)
        path.lineTo(x, y)
        const l = new Phaser.Math.Vector2(this.sprite.x - x, this.sprite.y - y).length()
        //console.log(l)
        this.move = {
            path: path,
            t: 0,
            inc: (10 * this.base_v) / l,
            last: {
                p: null,
                d: -1,
            },
        }
    }

    _currentTile: IMapTile | undefined
    public get currentTile() {
        return this._currentTile
    }

    private updateCurrentTile() {
        const tile = this.game.map?.getTileAt(this.sprite.x, this.sprite.y)
        if (tile !== this._currentTile) {
            if (this._currentTile) {
                this.onLeaveTile(this._currentTile, this)
            }
            if (tile) {
                this.onEnterTile(tile, this)
                console.log(`[PHASER] Changed Tile to ${tile.column}/${tile.row}`)
            }
            this._currentTile = tile
        }
    }

    update(time: number, delta: number) {
        delta /= 1000
        const o = this.move
        if (o) {
            if (o.t > 1) {
                const frame = this.sprite.anims.currentFrame
                this.sprite.anims.stop()
                this.sprite.setFrame(+frame.textureFrame - frame.index + 1)
                this.move = undefined

                this.onFinishedWalking(this)
                return
            }
            const p = o.path.getPoint(Phaser.Math.Easing.Sine.InOut(o.t))
            this.sprite.x = p.x
            this.sprite.y = p.y

            let v = 0
            let dir = 0
            if (o.last.p !== null) {
                const d = o.last.p.subtract(p)
                v = (o.last.p.length() / delta) * this.base_v
                dir = Math.floor((o.last.p.angle() - Math.PI / 8) / (Math.PI / 4))
                if (dir < 0) {
                    dir += 8
                }
                //console.log(Math.max(0.3, v * 0.65))
                this.sprite.anims.timeScale = Math.max(0.3, v * 0.005)
                if (dir != o.last.d && v > 0.05) {
                    //const frame = this.sprite.anims.currentFrame.index
                    this.sprite.anims.play(`${this.animKey}-${animNamesByDir[dir]}`, true)
                    o.last.d = dir
                }
            }
            o.last.p = p

            o.t += o.inc * delta

            this.updateCurrentTile()
        }
    }
}

interface IMapTile {
    readonly width: number
    readonly height: number
    readonly top: Phaser.Math.Vector2
    readonly right: Phaser.Math.Vector2
    readonly left: Phaser.Math.Vector2
    readonly bottom: Phaser.Math.Vector2
    readonly center: Phaser.Math.Vector2
    readonly bounds: Phaser.Geom.Rectangle

    readonly row: number
    readonly column: number
}

class IsometricTile implements IMapTile {
    public readonly map: IsometricMap
    public readonly image: Phaser.GameObjects.Image
    public readonly row: number
    public readonly column: number

    constructor(map: IsometricMap, x: number, y: number, type: string, c: number, r: number) {
        this.map = map

        this.image = map.scene.add.image(x, y, type)
        this.image.setOrigin(0, 0)
        this.row = r
        this.column = c
    }

    get width(): number {
        return this.image.displayWidth
    }

    get height(): number {
        return this.image.displayHeight
    }

    get top(): Phaser.Math.Vector2 {
        return this.image.getTopCenter()
    }

    get left(): Phaser.Math.Vector2 {
        const v = this.image.getLeftCenter()
        v.y -= this.map.tileOverhang / 2
        return v
    }

    get right(): Phaser.Math.Vector2 {
        const v = this.image.getRightCenter()
        v.y -= this.map.tileOverhang / 2
        return v
    }

    get bottom(): Phaser.Math.Vector2 {
        const v = this.image.getBottomCenter()
        v.y -= this.map.tileOverhang
        return v
    }

    get center(): Phaser.Math.Vector2 {
        const v = this.image.getCenter()
        v.y -= this.map.tileOverhang / 2
        return v
    }

    get bounds(): Phaser.Geom.Rectangle {
        const rect = this.image.getBounds()
        rect.height -= this.map.tileOverhang
        return rect
    }
}

interface ITiledMap {
    readonly tileWidth: number
    readonly tileHeight: number
    readonly tileOverhang: number
    readonly rows: number
    readonly columns: number

    getTile(c: number, r: number): IMapTile | undefined
    getTileAt(x: number, y: number): IMapTile | undefined
}

class TiledMap implements ITiledMap {
    private readonly game: Game
    readonly scene: Phaser.Scene

    protected _tileWidth: number
    protected _tileHeight: number
    public readonly tileOverhang: number
    protected config: MapConfig
    protected origin: Phaser.Math.Vector2
    protected dirX: Phaser.Math.Vector2
    protected dirY: Phaser.Math.Vector2

    public get tileWidth(): number {
        return this._tileWidth
    }

    public get tileHeight(): number {
        return this._tileHeight
    }

    public get rows(): number {
        return this.config.rows
    }

    public get columns(): number {
        return this.config.columns
    }

    protected tiles: IMapTile[][]

    public getTile(c: number, r: number): IMapTile | undefined {
        if (c < 0 || c >= this.columns || r < 0 || r >= this.rows) {
            return undefined
        }
        return this.tiles[r][c]
    }

    public getTileAt(inX: number, inY: number): IMapTile | undefined {
        const x = inX - this.origin.x
        const y = inY - this.origin.y

        let rf = (x / this.dirX.x + y / this.dirY.y) / 2
        if (rf < 0) {
            rf = Math.ceil(rf)
        } else {
            rf = Math.floor(rf)
        }
        let cf = (-y / this.dirY.y + x / this.dirX.x) / 2
        if (cf < 0) {
            cf = Math.ceil(cf)
        } else {
            cf = Math.floor(cf)
        }
        //console.log(`[PHASER] TielAt ${x}/${y} => ${cf}/${rf}`)
        if (cf < 0 || cf >= this.columns || rf < 0 || rf >= this.rows) {
            return undefined
        }

        return this.getTile(cf, rf)
    }

    constructor(game: Game, scene: Phaser.Scene, config: MapConfig) {
        this.game = game
        this.scene = scene
        this.config = config
        if (config.tileOverhang === undefined) {
            config.tileOverhang = 31
        }

        this.origin = new Phaser.Math.Vector2(config.offsetX, config.offsetY)

        this.tileOverhang = config.tileOverhang
        const tileSource = game.scene!.textures.get(config.tileType).getSourceImage()

        this._tileWidth = tileSource.width
        this._tileHeight = tileSource.height - this.tileOverhang
        this.dirX = new Phaser.Math.Vector2(this.tileWidth / 2, this.tileHeight / -2)
        this.dirY = new Phaser.Math.Vector2(this.tileWidth / 2, this.tileHeight / 2)

        this.tiles = []
        for (let r = 0; r < config.rows; r++) {
            this.tiles[r] = []
        }
    }
}

class IsometricMap extends TiledMap {
    constructor(game: Game, scene: Phaser.Scene, config: MapConfig) {
        super(game, scene, config)

        const ox = config.offsetX
        const oy = config.offsetY - config.columns * this.dirX.y
        this.origin = new Phaser.Math.Vector2(ox, oy)
        for (let r = 0; r < config.rows; r++) {
            const roy = oy + (r + 1) * (this._tileHeight / 2)
            const rox = ox + r * (this._tileWidth / 2)
            for (let c = config.columns - 1; c >= 0; c--) {
                this.tiles[r][c] = new IsometricTile(
                    this,
                    this.origin.x + c * this.dirX.x + r * this.dirY.x,
                    this.origin.y + c * this.dirX.y + r * this.dirY.y - this.tileHeight / 2,
                    config.tileType,
                    c,
                    r
                )
            }
        }
    }
}

class ResoureManager {
    constructor(private readonly game: Game) {}

    public loadSprite(key: string, cfg: SpriteConfig) {
        this.game.pushSpriteSheet({
            key: key,
            uri: cfg.uri,
            frameConfig: cfg.frameConfig,
            directional: false,
            repeat: cfg.repeat,
            shiftY: cfg.shiftY,
        })
    }

    public loadCustomSprite(
        key: string,
        uri: string,
        frameConfig: Phaser.Types.Loader.FileTypes.ImageFrameConfig,
        directional: boolean = false,
        shiftY: number = 0
    ) {
        const cfg: GameSheetResource = {
            key: key,
            uri: uri,
            frameConfig: frameConfig,
            directional: directional,
            repeat: -1,
            shiftY: shiftY,
        }
        this.game.pushSpriteSheet(cfg)
    }

    public loadFigure(key: string, cfg: FigureConfig) {
        this.loadCustomFigure(key, cfg.type, cfg.big, cfg.loaded)
    }

    public loadCustomFigure(
        key: string,
        type: string,
        big: boolean = false,
        loaded: boolean = false
    ) {
        const cfg = {
            key: key,
            uri: `resources/sprite/figure_${type}${loaded ? '_loaded' : ''}${
                big ? '_big' : ''
            }.png`,
            frameConfig: {
                frameWidth: big ? 76 : 38,
                frameHeight: big ? 64 : 32,
            },
            directional: true,
            repeat: -1,
            shiftY: 0,
        }
        this.game.pushSpriteSheet(cfg)
    }
}

class Game {
    private game: Phaser.Game | undefined
    public readonly domElement: JQuery
    public readonly backgroundColor: string

    private _scene: Phaser.Scene | undefined
    private created: boolean = false
    private _map: ITiledMap | undefined
    private animatedSprites: BaseAnimatedSprite[] = []

    public onPreload: (scene: Phaser.Scene, game: Game) => void
    public onCreate: (scene: Phaser.Scene, game: Game) => void
    public onUpdate: (scene: Phaser.Scene, game: Game, time: number, delta: number) => void

    private readonly imagesResources: GameResource[] = []
    private readonly spritesheetResources: GameSheetResource[] = []
    private readonly spriteConfigs: AnimatedSpriteConfig[] = []
    private mapConfig: MapConfig | undefined

    constructor(domElement: JQuery, backgroundColor: string) {
        const self = this
        this.domElement = domElement
        this.backgroundColor = backgroundColor

        this.onPreload = () => {}
        this.onCreate = () => {}
        this.onUpdate = () => {}
    }

    public get map(): ITiledMap | undefined {
        return this._map
    }

    public get scene() {
        return this._scene
    }

    public addImage(key: string, uri: string) {
        this.imagesResources.push({ key: key, uri: uri })

        if (this._scene) {
            this._scene.load.image(key, uri)
        }
    }

    private generateSpriteSheetDirections(cfg: GameSheetResource) {
        const self = this
        if (self._scene && this.created) {
            if (cfg.directional) {
                animNamesByDir.forEach((name, nr) => {
                    const idx = sheetIndex[nr]
                    const conf = {
                        start: idx * 20,
                        end: idx * 20 + 19,
                    }

                    console.log(`[PHASER] Add Directional Anim ${cfg.key}-${name}`)
                    self._scene!.anims.create({
                        key: `${cfg.key}-${name}`,
                        frames: self._scene!.anims.generateFrameNumbers(cfg.key, conf),
                        frameRate: 25,
                        repeat: -1,
                    })
                })
            } else {
                const conf = {
                    start: cfg.frameConfig.startFrame,
                    end: cfg.frameConfig.endFrame,
                }

                console.log(`[PHASER] Add Anim ${cfg.key}`)
                self._scene!.anims.create({
                    key: `${cfg.key}`,
                    frames: self._scene!.anims.generateFrameNumbers(cfg.key, conf),
                    frameRate: 25,
                    repeat: cfg.repeat,
                })
            }
        }
    }

    private generateSpriteSheet(cfg: GameSheetResource) {
        const self = this
        if (self._scene) {
            console.log(`[PHASER] Load Spritesheet ${cfg.key}`)
            self._scene.load.spritesheet(cfg.key, cfg.uri, cfg.frameConfig)
            if (self.created) {
                self.generateSpriteSheetDirections(cfg)
            }
        }
    }

    public readonly resources = new ResoureManager(this)
    public pushSpriteSheet(cfg: GameSheetResource) {
        this.spritesheetResources.push(cfg)
        if (this._scene) {
            this.generateSpriteSheet(cfg)
        }
    }

    public removeSprite(ctx: BaseAnimatedSprite) {
        ctx.sprite.destroy()
        this.animatedSprites = this.animatedSprites.filter((s) => s !== ctx)
    }

    private generateSprite(config: AnimatedSpriteConfig) {
        if (this.scene && this.created) {
            console.log('[PHASER] Adding Sprite')
            let sprite: BaseAnimatedSprite
            if (config.type === 'walking') {
                sprite = WalkingSprite.add(this, this.scene, config)
            } else {
                sprite = AnimatedSprite.add(this, this.scene, config)
            }
            if (sprite) {
                this.animatedSprites.push(sprite)
            }
            return sprite
        }
        return undefined
    }

    public addWalkingSpriteOnTile(
        c: number,
        r: number,
        texture: string,
        frame?: string | number,
        originX?: number,
        originY?: number,
        speed?: number
    ) {
        return this.addSpriteOnTile('walking', c, r, texture, frame, originX, originY, speed)
    }

    public addWalkingSprite(
        x: number,
        y: number,
        texture: string,
        frame?: string | number,
        originX?: number,
        originY?: number,
        speed?: number
    ) {
        return this.addSprite('walking', x, y, texture, frame, originX, originY, speed)
    }

    public addAnimatedSpriteOnTile(
        c: number,
        r: number,
        texture: string,
        frame?: string | number,
        originX?: number,
        originY?: number,
        speed?: number
    ) {
        return this.addSpriteOnTile('animated', c, r, texture, frame, originX, originY, speed)
    }

    public addAnimatedSprite(
        x: number,
        y: number,
        texture: string,
        frame?: string | number,
        originX?: number,
        originY?: number,
        speed?: number
    ) {
        return this.addSprite('animated', x, y, texture, frame, originX, originY, speed)
    }

    public addSpriteOnTile(
        type: 'walking' | 'animated',
        c: number,
        r: number,
        texture: string,
        frame?: string | number,
        originX?: number,
        originY?: number,
        speed?: number
    ) {
        const tile = this.map?.getTile(c, r)
        if (tile) {
            const p = tile.center
            return this.addSprite(type, p.x, p.y, texture, frame, originX, originY, speed, tile)
        } else {
            console.error(`[PHASER] Tile ${c}/${r} does not exists.`)
        }
        return undefined
    }

    public addSprite(
        type: 'walking' | 'animated',
        x: number,
        y: number,
        texture: string,
        frame?: string | number,
        originX?: number,
        originY?: number,
        speed?: number,
        tile?: IMapTile
    ) {
        const sheetCfg: GameSheetResource | undefined = this.spritesheetResources.find(
            (c) => c.key === texture
        )
        let shiftY = 0
        if (sheetCfg) {
            shiftY = sheetCfg.shiftY
        }
        console.log(sheetCfg)
        const cfg: AnimatedSpriteConfig = {
            type: type,
            x: x,
            y: y,
            texture: texture,
            frame: frame,
            originX: originX,
            originY: originY,
            speed: speed,
            tile: tile,
            shiftY: shiftY,
        }

        this.spriteConfigs.push(cfg)
        if (this.scene && this.created) {
            const s = this.generateSprite(cfg)
            return s
        }

        return undefined
    }

    private attachMap() {
        if (this._map !== undefined) {
            console.error('Only one map per game!')
            return
        }

        if (this.mapConfig && this.mapConfig.type === 'isometric' && this.scene && this.created) {
            console.log('[PHASER] Attaching MAP')
            this._map = new IsometricMap(this, this.scene, this.mapConfig)
        }
    }

    public useIsometricMap(
        offsetX: number,
        offsetY: number,
        columns: number,
        rows: number,
        tileType: string,
        tileOverhang?: number
    ) {
        this.mapConfig = {
            type: 'isometric',
            offsetX: offsetX,
            offsetY: offsetY,
            columns: columns,
            rows: rows,
            tileType: tileType,
            tileOverhang: tileOverhang,
        }

        this.attachMap()
    }

    public start(allowResize: boolean = false) {
        if (globalThis.game !== undefined) {
            console.error('Can only start once!')
            return
        }
        const self = this
        const sceneConfig: Phaser.Types.Scenes.CreateSceneFromObjectConfig = {
            preload: function (this: Phaser.Scene) {
                self.preload(this)
            },
            create: function (this: Phaser.Scene) {
                self.create(this)
            },
            update: function (this: Phaser.Scene, time?, delta?) {
                self.update(this, time, delta)
            },
        }
        const config: Phaser.Types.Core.GameConfig = {
            type: Phaser.AUTO,
            backgroundColor: this.backgroundColor,
            scale: {
                parent: this.domElement[0],
                mode: Phaser.Scale.NONE,
                width: this.domElement.width(),
                height: this.domElement.height(),
                zoom: 1,
            },
            scene: sceneConfig,
        }

        this.game = new Phaser.Game(config)
        if (allowResize) {
            window.addEventListener('resize', this.resize.bind(this))
        }
    }

    private preload(scene: Phaser.Scene) {
        console.log('[PHASER] PRELOAD')
        this.onPreload(scene, this)

        this._scene = scene
        this.imagesResources.forEach((r) => scene.load.image(r.key, r.uri))
        this.spritesheetResources.forEach((r) => this.generateSpriteSheet(r))
    }

    private create(scene: Phaser.Scene) {
        console.log('[PHASER] CREATE')
        scene.cameras.main.setRoundPixels(true)
        this.created = true
        this.attachMap()

        this.spritesheetResources.forEach((r) => this.generateSpriteSheetDirections(r))
        this.spriteConfigs.forEach((c) => this.generateSprite(c))

        this.onCreate(scene, this)
    }

    private update(scene: Phaser.Scene, time: number = 0, delta: number = 0) {
        this.animatedSprites.forEach((s) => s.update(time, delta))

        this.onUpdate(scene, this, time, delta)
    }

    private resize() {
        if (this.game === undefined) {
            return
        }
        const w = this.domElement.width() as number
        const h = this.domElement.height() as number
        // manually resize the game with the Phaser 3.16 scalemanager
        this.game.scale.resize(w, h)
        // Check which scene is active.
        for (const scene of this.game.scene.getScenes()) {
            if (scene.scene.settings.active) {
                // Scale the camera
                scene.cameras.main.setViewport(0, 0, w, h)
                // if (scene.resizeField) {
                //     // Scale/position stuff in the scene itself with this method, that the scene must implement.
                //     scene.resizeField(w, h)
                // }
            }
        }
    }
}

class IsometricMapGame {
    constructor(
        public readonly columns: number,
        public readonly rows: number,
        private readonly tileConfig: TileConfig,
        private readonly figureConfigs: FigureConfig[],
        private readonly backgroundColor: string,
        private readonly onPreload?: (
            game: Game,
            manager: IsometricMapGame,
            canvasElement: JQuery,
            outputElement: JQuery,
            scope: JQuery,
            runner: any
        ) => void
    ) {
        this.scope = jQuery()
        this.figures = []

        this.onCreate = () => {}
        this.onClick = () => {}
        this.onEnterTile = () => {}
        this.onLeaveTile = () => {}
        this.onFinishedWalking = () => {}
        this.onFinishedAnimation = () => {}
        this.onTick = () => {}

        this.update = (txt) => {
            return txt
        }
        this.onMessage = () => {}
        this.beforeStart = () => {}
        this.whenFinished = () => {}
        this.addArgumentsTo = () => {}
        this.onUpdate = () => {}
    }

    private scope: JQuery
    private game: Game | undefined
    private figures: WalkingSprite[]

    public createFigureOnTile(
        key: string,
        col: number,
        row: number,
        startFrame: number = 0
    ): WalkingSprite {
        if (this.game) {
            const f = this.game.addWalkingSpriteOnTile(col, row, key, startFrame) as WalkingSprite

            f.onEnterTile = this.onEnterTile.bind(this)
            f.onLeaveTile = this.onLeaveTile.bind(this)
            f.onFinishedWalking = this.onFinishedWalking.bind(this)

            return f
        } else {
            throw new Error('Unable to create new Figure. Game not yet initialized')
        }
    }

    public createSpriteOnTile(
        key: string,
        col: number,
        row: number,
        startPlaying: boolean = true,
        startFrame: number = 0
    ): AnimatedSprite {
        if (this.game) {
            const f = this.game.addAnimatedSpriteOnTile(col, row, key, startFrame) as AnimatedSprite
            f.onFinishedAnimation = this.onFinishedAnimation.bind(this)
            if (startPlaying) {
                f.play()
            }

            return f
        } else {
            throw new Error('Unable to create new Sprite. Game not yet initialized')
        }
    }

    public createSprite(
        key: string,
        x: number,
        y: number,
        startPlaying: boolean = true,
        startFrame: number = 0
    ): AnimatedSprite {
        if (this.game) {
            const f = this.game.addAnimatedSprite(x, y, key, startFrame) as AnimatedSprite
            f.onFinishedAnimation = this.onFinishedAnimation.bind(this)
            if (startPlaying) {
                f.play()
            }

            return f
        } else {
            throw new Error('Unable to create new Sprite. Game not yet initialized')
        }
    }

    init(canvasElement: JQuery, outputElement: JQuery, scope: JQuery, runner: any) {
        console.log('[PHASER] INIT ISOMETRIC GAME')
        canvasElement.css('border', 'none')
        const self = this
        this.scope = scope

        const game = new Game(canvasElement, this.backgroundColor)
        this.game = game

        this.figureConfigs
            .filter((v, i, a) => a.indexOf(v) === i)
            .forEach((cfg, idx) => {
                game.resources.loadCustomFigure(`figure.${idx}`, cfg.type, cfg.big, cfg.loaded)
            })

        game.addImage('tile', this.tileConfig.uri)
        game.useIsometricMap(0, 30, this.columns, this.rows, 'tile')

        game.onPreload = (scene, game) => {
            if (this.onPreload) {
                this.onPreload(game, this, canvasElement, outputElement, scope, runner)
            }
        }
        game.onCreate = (scene, game) => {
            this.figures = this.figureConfigs.map((cfg, i, a) => {
                const idx = a.indexOf(cfg)
                const name = `figure.${idx}`

                return self.createFigureOnTile(name, 0, 0)
            })
            this.onCreate()

            scene.input.on('pointerdown', (e: any) => {
                const t = game.map?.getTileAt(e.x, e.y)
                if (t !== undefined) {
                    this.onClick(t)
                    console.log('[PHASER] tile = ', t.column, t.row)
                    runner.postMessage('click', {
                        r: t.row,
                        c: t.column,
                    })
                }
            })
        }

        game.onUpdate = (scene: Phaser.Scene, game: Game, time: number, delta: number) => {
            self.onTick(time, delta)
        }

        game.start(false)
    }

    update(
        txt: string,
        json: object | undefined,
        canvasElement: JQuery<HTMLElement>,
        outputElement: JQuery<HTMLElement>
    ) {
        this.onUpdate(txt, json, canvasElement, outputElement)
    }

    public onCreate: () => void
    public onClick: (tile: IMapTile) => void
    public onEnterTile: (tile: IMapTile, figure: WalkingSprite) => void
    public onLeaveTile: (tile: IMapTile, figure: WalkingSprite) => void
    public onFinishedWalking: (figure: WalkingSprite) => void
    public onFinishedAnimation: (sprite: AnimatedSprite) => void
    public onTick: (time: number, delta: number) => void

    public onUpdate: (
        txt: string,
        json: object | undefined,
        canvasElement: JQuery,
        outputElement: JQuery
    ) => any

    public onMessage: (cmd: string, data: any) => void
    public beforeStart: () => void
    public whenFinished: (args: string[] | object) => void
    public addArgumentsTo: (args: object | string[]) => void
}
