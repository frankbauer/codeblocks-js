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
    type: 'walking'
    x: number
    y: number
    originX?: number
    originY?: number
    texture: string
    frame?: string | number
    speed?: number
}

class AnimatedSprite {}

class WalkingSprite {
    private readonly sprite: Phaser.GameObjects.Sprite
    private readonly game: Game
    private base_v: number = 5
    private move: GdIMove | undefined = undefined
    private animKey: string
    private constructor(
        game: Game,
        sprite: Phaser.GameObjects.Sprite,
        config: AnimatedSpriteConfig
    ) {
        this.sprite = sprite
        this.game = game
        this.animKey = config.texture
    }

    static add(game: Game, scene: Phaser.Scene, config: AnimatedSpriteConfig): WalkingSprite {
        const s = scene.add.sprite(config.x, config.y, config.texture, config.frame)
        const oy = config.originY ? config.originY : 36 / 64
        const ox = config.originX ? config.originX : 37 / 76
        s.setOrigin(ox, oy)

        const sprite = new WalkingSprite(game, s, config)
        if (config.speed) {
            sprite.setBaseSpeed(config.speed)
        }
        return sprite
    }

    setOrigin(x: number, y: number) {
        this.sprite.setOrigin(x, y)
    }

    moveTo(x: number, y: number) {
        this.sprite.x = x
        this.sprite.y = y
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

    setBaseSpeed(bsp: number) {
        this.base_v = bsp
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
    readonly bounds: Phaser.Geom.Rectangle
}

class IsometricTile implements IMapTile {
    public readonly map: IsometricMap
    public readonly image: Phaser.GameObjects.Image

    constructor(map: IsometricMap, x: number, y: number, type: string) {
        this.map = map

        this.image = map.scene.add.image(x, y, type)
        console.log('[PHASER]', this.bounds)
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

    get bounds(): Phaser.Geom.Rectangle {
        const rect = this.image.getBounds()
        rect.height -= this.map.tileOverhang
        return rect
    }
}

interface ITiledMap {
    readonly tileWidth: number
    readonly tileHeight: number
}

class TiledMap implements ITiledMap {
    private readonly game: Game
    readonly scene: Phaser.Scene

    protected _tileWidth: number
    protected _tileHeight: number
    public readonly tileOverhang: number
    protected config: MapConfig

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

    public getTile(c: number, r: number) {
        return this.tiles[r][c]
    }

    constructor(game: Game, scene: Phaser.Scene, config: MapConfig) {
        this.game = game
        this.scene = scene
        this.config = config
        if (config.tileOverhang === undefined) {
            config.tileOverhang = 31
        }
        this.tileOverhang = config.tileOverhang
        const tileSource = game.scene!.textures.get(config.tileType).getSourceImage()

        this._tileWidth = tileSource.width
        this._tileHeight = tileSource.height - this.tileOverhang

        this.tiles = []
        for (let r = 0; r < config.rows; r++) {
            this.tiles[r] = []
        }
    }
}

class IsometricMap extends TiledMap {
    constructor(game: Game, scene: Phaser.Scene, config: MapConfig) {
        super(game, scene, config)

        const ox = config.offsetX + this._tileWidth / 2
        const oy =
            config.offsetY + this.tileOverhang / 2 + (config.columns - 1) * (this._tileHeight / 2)

        for (let r = 0; r < config.rows; r++) {
            const roy = oy + (r + 1) * (this._tileHeight / 2)
            const rox = ox + r * (this._tileWidth / 2)
            for (let c = config.columns - 1; c >= 0; c--) {
                this.tiles[r][c] = new IsometricTile(
                    this,
                    rox + c * (this._tileWidth / 2),
                    roy - c * (this._tileHeight / 2),
                    config.tileType
                )
            }
        }
    }
}

class Game {
    private game: Phaser.Game | undefined
    public readonly domElement: JQuery
    public readonly backgroundColor: string

    private _scene: Phaser.Scene | undefined
    private created: boolean = false
    private _map: ITiledMap | undefined
    private readonly walkingSprites: WalkingSprite[] = []

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
            animNamesByDir.forEach((name, nr) => {
                const idx = sheetIndex[nr]
                const conf = { start: idx * 20, end: idx * 20 + 19 }
                console.log(`[PHASER] Add Anim ${cfg.key}-${name}`)
                self._scene!.anims.create({
                    key: `${cfg.key}-${name}`,
                    frames: self._scene!.anims.generateFrameNumbers(cfg.key, conf),
                    frameRate: 25,
                    repeat: -1,
                })
            })
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

    public addSpriteSheet(
        key: string,
        uri: string,
        frameConfig: Phaser.Types.Loader.FileTypes.ImageFrameConfig,
        directional: boolean = false
    ) {
        const cfg = {
            key: key,
            uri: uri,
            frameConfig: frameConfig,
            directional: directional,
        }
        this.spritesheetResources.push(cfg)
        if (this._scene) {
            this.generateSpriteSheet(cfg)
        }
    }

    private generateWalkingSprite(config: AnimatedSpriteConfig) {
        if (this.scene && this.created) {
            console.log('[PHASER] Adding Sprite')
            const ws = WalkingSprite.add(this, this.scene, config)
            if (ws) {
                this.walkingSprites.push(ws)
            }
            return ws
        }
        return undefined
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
        const cfg: AnimatedSpriteConfig = {
            type: 'walking',
            x: x,
            y: y,
            texture: texture,
            frame: frame,
            originX: originX,
            originY: originY,
            speed: speed,
        }

        this.spriteConfigs.push(cfg)
        if (this.scene && this.created) {
            const s = this.generateWalkingSprite(cfg)
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
        this.spritesheetResources
            .filter((c) => c.directional)
            .forEach((r) => this.generateSpriteSheetDirections(r))

        this.spriteConfigs
            .filter((c) => c.type === 'walking')
            .forEach((c) => this.generateWalkingSprite(c))

        this.onCreate(scene, this)

        // const oy = 36/64;
        // const ox = 37/76;
        // f1 = AnimatedSprite.add(this, 190, 84, 'figure', 0)
        // f1.moveTo(ox, oy)
        // this.add.sprite(100, 84, 'small', 0).setOrigin(ox, oy)
        // f2 = AnimatedSprite.add(this, 280, 84, 'figure', 0)
        // f2.moveTo(ox, oy)
        // animNamesByDir.forEach((namess, nr) => {
        //     const idx = sheetIndex[nr];
        //     const conf = { start: idx*20, end: idx*20 + 19 };
        //     console.log('ADD', name, conf)
        //     this.anims.create({
        //         key: 'figure-'+name,
        //         frames: this.anims.generateFrameNumbers('figure', conf),
        //         frameRate: 25,
        //         repeat: -1
        //     });
        // })
        // f2.sprite.anims.play('figure-O')
        // f1.sprite.anims.play('figure-S')
        // f2.walkTo(280-3*45, 84+3*26)
        // f1.walkTo(280, 84)
    }

    private update(scene: Phaser.Scene, time: number = 0, delta: number = 0) {
        console.log('[PHASER] UPDATE', this.walkingSprites.length)
        // f1.update(time, delta)
        // f2.update(time, delta)

        this.walkingSprites.forEach((s) => s.update(time, delta))

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
