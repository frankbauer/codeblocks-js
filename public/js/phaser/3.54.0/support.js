"use strict";
/// <reference path="./types/phaser.d.ts" />
const animNamesByDir = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'];
const sheetIndex = [0, 1, 3, 5, 4, 6, 7, 2];
class Tiles {
}
Tiles.Checkers = { uri: 'resources/tile/checker.png' };
Tiles.Gras = { uri: 'resources/tile/gras.png' };
class Sprites {
}
Sprites.Fire = {
    uri: 'resources/tile/fire_00.png',
    repeat: 0,
    frameConfig: {
        frameWidth: 90,
        frameHeight: 83,
        startFrame: 0,
        endFrame: 251,
    },
};
Sprites.Snow = [0, 1, 2, 3].map((nr) => {
    return {
        uri: `resources/tile/snow_${('00' + nr).slice(-2)}.png`,
        repeat: -1,
        frameConfig: {
            frameWidth: 90,
            frameHeight: 83,
            startFrame: 0,
            endFrame: 125,
        },
    };
});
Sprites.Snowman = [0, 1, 2, 3, 4].map((nr) => {
    return {
        uri: `resources/tile/snowman_${('00' + nr).slice(-2)}.png`,
        repeat: 0,
        frameConfig: {
            frameWidth: 90,
            frameHeight: 53,
            startFrame: 0,
            endFrame: 59,
        },
    };
});
Sprites.HolidaySnowman = [0, 1, 2, 3, 4, 5].map((nr) => {
    return {
        uri: `resources/tile/snowman_xmas_${('00' + nr).slice(-2)}.png`,
        repeat: 0,
        frameConfig: {
            frameWidth: 90,
            frameHeight: 53,
            startFrame: 0,
            endFrame: 59,
        },
    };
});
Sprites.Hut = [0, 1, 2, 3, 4, 5].map((nr) => {
    return {
        uri: `resources/tile/huts_${('00' + nr).slice(-2)}.png`,
        repeat: 0,
        frameConfig: {
            frameWidth: 120,
            frameHeight: 64,
            startFrame: 0,
            endFrame: 0,
        },
    };
});
Sprites.Stones = [
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
    };
});
Sprites.Trees = [
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
    };
});
class Figures {
}
Figures.Blue = {
    type: 'blue',
    big: false,
    loaded: false,
};
Figures.BlueLoaded = {
    type: 'blue',
    big: false,
    loaded: true,
};
Figures.BigBlue = {
    type: 'blue',
    big: true,
    loaded: false,
};
Figures.BigBlueLoaded = {
    type: 'blue',
    big: true,
    loaded: true,
};
Figures.Green = {
    type: 'blue',
    big: false,
    loaded: false,
};
Figures.GreenLoaded = {
    type: 'blue',
    big: false,
    loaded: true,
};
Figures.BigGreen = {
    type: 'blue',
    big: true,
    loaded: false,
};
Figures.BigGreenLoaded = {
    type: 'green',
    big: true,
    loaded: true,
};
Figures.Snowman = {
    type: 'snowman',
    big: false,
    loaded: false,
};
Figures.SnowmanLoaded = {
    type: 'snowman',
    big: false,
    loaded: true,
};
Figures.BigSnowman = {
    type: 'snowman',
    big: true,
    loaded: false,
};
Figures.BigSnowmanLoaded = {
    type: 'snowman',
    big: true,
    loaded: true,
};
Figures.HolidaySnowman = {
    type: 'snowman_xmas',
    big: false,
    loaded: false,
};
Figures.HolidaySnowmanLoaded = {
    type: 'snowman_xmas',
    big: false,
    loaded: true,
};
Figures.BigHolidaySnowman = {
    type: 'snowman_xmas',
    big: true,
    loaded: false,
};
Figures.BigHolidaySnowmanLoaded = {
    type: 'snowman_xmas',
    big: true,
    loaded: true,
};
Figures.Grinch = {
    type: 'grinch',
    big: false,
    loaded: false,
};
Figures.GrinchLoaded = {
    type: 'grinch',
    big: false,
    loaded: true,
};
Figures.BigGrinch = {
    type: 'grinch',
    big: true,
    loaded: false,
};
Figures.BigGrinchLoaded = {
    type: 'grinch',
    big: true,
    loaded: true,
};
class BaseAnimatedSprite {
    constructor(game, sprite, config) {
        this.base_v = 5;
        this.sprite = sprite;
        this.game = game;
        this.animKey = config.texture;
    }
    setOrigin(x, y) {
        this.sprite.setOrigin(x, y);
    }
    setBaseSpeed(bsp) {
        this.base_v = bsp;
    }
    remove() {
        this.game.removeSprite(this);
    }
    update(time, delta) { }
}
class AnimatedSprite extends BaseAnimatedSprite {
    constructor(game, sprite, config) {
        super(game, sprite, config);
        this.onFinishedAnimation = () => { };
        sprite.on('animationcomplete', this.finishedAnimation, this);
    }
    static add(game, scene, config) {
        const s = scene.add.sprite(config.x, config.y, config.texture, config.frame);
        const oy = config.originY ? config.originY : 36 / 64;
        const ox = config.originX ? config.originX : 37 / 76;
        s.setOrigin(ox, oy);
        const sprite = new AnimatedSprite(game, s, config);
        if (config.speed) {
            sprite.setBaseSpeed(config.speed);
        }
        return sprite;
    }
    finishedAnimation() {
        this.onFinishedAnimation(this);
    }
    play() {
        this.sprite.anims.play(`${this.animKey}`, true);
    }
    stop() {
        this.sprite.anims.stop();
    }
}
class WalkingSprite extends BaseAnimatedSprite {
    constructor(game, sprite, config) {
        super(game, sprite, config);
        this.move = undefined;
        this.onEnterTile = () => { };
        this.onLeaveTile = () => { };
        this.onFinishedWalking = () => { };
        this.updateCurrentTile();
    }
    static add(game, scene, config) {
        const s = scene.add.sprite(config.x, config.y, config.texture, config.frame);
        const oy = config.originY ? config.originY : 36 / 64;
        const ox = config.originX ? config.originX : 37 / 76;
        s.setOrigin(ox, oy);
        const sprite = new WalkingSprite(game, s, config);
        if (config.speed) {
            sprite.setBaseSpeed(config.speed);
        }
        return sprite;
    }
    moveToTile(c, r) {
        var _a;
        const tile = (_a = this.game.map) === null || _a === void 0 ? void 0 : _a.getTile(c, r);
        if (tile) {
            const p = tile.center;
            this.moveTo(p.x, p.y);
        }
    }
    moveTo(x, y) {
        this.sprite.x = x;
        this.sprite.y = y;
        this.updateCurrentTile();
    }
    walkToTile(c, r) {
        var _a;
        const tile = (_a = this.game.map) === null || _a === void 0 ? void 0 : _a.getTile(c, r);
        if (tile) {
            const p = tile.center;
            this.walkTo(p.x, p.y);
        }
    }
    walkTo(x, y) {
        const path = new Phaser.Curves.Path(this.sprite.x, this.sprite.y);
        path.lineTo(x, y);
        const l = new Phaser.Math.Vector2(this.sprite.x - x, this.sprite.y - y).length();
        //console.log(l)
        this.move = {
            path: path,
            t: 0,
            inc: (10 * this.base_v) / l,
            last: {
                p: null,
                d: -1,
            },
        };
    }
    get currentTile() {
        return this._currentTile;
    }
    updateCurrentTile() {
        var _a;
        const tile = (_a = this.game.map) === null || _a === void 0 ? void 0 : _a.getTileAt(this.sprite.x, this.sprite.y);
        if (tile !== this._currentTile) {
            if (this._currentTile) {
                this.onLeaveTile(this._currentTile, this);
            }
            if (tile) {
                this.onEnterTile(tile, this);
                console.log(`[PHASER] Changed Tile to ${tile.column}/${tile.row}`);
            }
            this._currentTile = tile;
        }
    }
    update(time, delta) {
        delta /= 1000;
        const o = this.move;
        if (o) {
            if (o.t > 1) {
                const frame = this.sprite.anims.currentFrame;
                this.sprite.anims.stop();
                this.sprite.setFrame(+frame.textureFrame - frame.index + 1);
                this.move = undefined;
                this.onFinishedWalking(this);
                return;
            }
            const p = o.path.getPoint(Phaser.Math.Easing.Sine.InOut(o.t));
            this.sprite.x = p.x;
            this.sprite.y = p.y;
            let v = 0;
            let dir = 0;
            if (o.last.p !== null) {
                const d = o.last.p.subtract(p);
                v = (o.last.p.length() / delta) * this.base_v;
                dir = Math.floor((o.last.p.angle() - Math.PI / 8) / (Math.PI / 4));
                if (dir < 0) {
                    dir += 8;
                }
                //console.log(Math.max(0.3, v * 0.65))
                this.sprite.anims.timeScale = Math.max(0.3, v * 0.005);
                if (dir != o.last.d && v > 0.05) {
                    //const frame = this.sprite.anims.currentFrame.index
                    this.sprite.anims.play(`${this.animKey}-${animNamesByDir[dir]}`, true);
                    o.last.d = dir;
                }
            }
            o.last.p = p;
            o.t += o.inc * delta;
            this.updateCurrentTile();
        }
    }
}
class IsometricTile {
    constructor(map, x, y, type, c, r) {
        this.map = map;
        this.image = map.scene.add.image(x, y, type);
        this.image.setOrigin(0, 0);
        this.row = r;
        this.column = c;
    }
    get width() {
        return this.image.displayWidth;
    }
    get height() {
        return this.image.displayHeight;
    }
    get top() {
        return this.image.getTopCenter();
    }
    get left() {
        const v = this.image.getLeftCenter();
        v.y -= this.map.tileOverhang / 2;
        return v;
    }
    get right() {
        const v = this.image.getRightCenter();
        v.y -= this.map.tileOverhang / 2;
        return v;
    }
    get bottom() {
        const v = this.image.getBottomCenter();
        v.y -= this.map.tileOverhang;
        return v;
    }
    get center() {
        const v = this.image.getCenter();
        v.y -= this.map.tileOverhang / 2;
        return v;
    }
    get bounds() {
        const rect = this.image.getBounds();
        rect.height -= this.map.tileOverhang;
        return rect;
    }
}
class TiledMap {
    constructor(game, scene, config) {
        this.game = game;
        this.scene = scene;
        this.config = config;
        if (config.tileOverhang === undefined) {
            config.tileOverhang = 31;
        }
        this.origin = new Phaser.Math.Vector2(config.offsetX, config.offsetY);
        this.tileOverhang = config.tileOverhang;
        const tileSource = game.scene.textures.get(config.tileType).getSourceImage();
        this._tileWidth = tileSource.width;
        this._tileHeight = tileSource.height - this.tileOverhang;
        this.dirX = new Phaser.Math.Vector2(this.tileWidth / 2, this.tileHeight / -2);
        this.dirY = new Phaser.Math.Vector2(this.tileWidth / 2, this.tileHeight / 2);
        this.tiles = [];
        for (let r = 0; r < config.rows; r++) {
            this.tiles[r] = [];
        }
    }
    get tileWidth() {
        return this._tileWidth;
    }
    get tileHeight() {
        return this._tileHeight;
    }
    get rows() {
        return this.config.rows;
    }
    get columns() {
        return this.config.columns;
    }
    getTile(c, r) {
        if (c < 0 || c >= this.columns || r < 0 || r >= this.rows) {
            return undefined;
        }
        return this.tiles[r][c];
    }
    getTileAt(inX, inY) {
        const x = inX - this.origin.x;
        const y = inY - this.origin.y;
        let rf = (x / this.dirX.x + y / this.dirY.y) / 2;
        if (rf < 0) {
            rf = Math.ceil(rf);
        }
        else {
            rf = Math.floor(rf);
        }
        let cf = (-y / this.dirY.y + x / this.dirX.x) / 2;
        if (cf < 0) {
            cf = Math.ceil(cf);
        }
        else {
            cf = Math.floor(cf);
        }
        //console.log(`[PHASER] TielAt ${x}/${y} => ${cf}/${rf}`)
        if (cf < 0 || cf >= this.columns || rf < 0 || rf >= this.rows) {
            return undefined;
        }
        return this.getTile(cf, rf);
    }
}
class IsometricMap extends TiledMap {
    constructor(game, scene, config) {
        super(game, scene, config);
        const ox = config.offsetX;
        const oy = config.offsetY - config.columns * this.dirX.y;
        this.origin = new Phaser.Math.Vector2(ox, oy);
        for (let r = 0; r < config.rows; r++) {
            const roy = oy + (r + 1) * (this._tileHeight / 2);
            const rox = ox + r * (this._tileWidth / 2);
            for (let c = config.columns - 1; c >= 0; c--) {
                this.tiles[r][c] = new IsometricTile(this, this.origin.x + c * this.dirX.x + r * this.dirY.x, this.origin.y + c * this.dirX.y + r * this.dirY.y - this.tileHeight / 2, config.tileType, c, r);
            }
        }
    }
}
class Game {
    constructor(domElement, backgroundColor) {
        this.created = false;
        this.animatedSprites = [];
        this.imagesResources = [];
        this.spritesheetResources = [];
        this.spriteConfigs = [];
        const self = this;
        this.domElement = domElement;
        this.backgroundColor = backgroundColor;
        this.onPreload = () => { };
        this.onCreate = () => { };
        this.onUpdate = () => { };
    }
    get map() {
        return this._map;
    }
    get scene() {
        return this._scene;
    }
    addImage(key, uri) {
        this.imagesResources.push({ key: key, uri: uri });
        if (this._scene) {
            this._scene.load.image(key, uri);
        }
    }
    generateSpriteSheetDirections(cfg) {
        const self = this;
        if (self._scene && this.created) {
            if (cfg.directional) {
                animNamesByDir.forEach((name, nr) => {
                    const idx = sheetIndex[nr];
                    const conf = {
                        start: idx * 20,
                        end: idx * 20 + 19,
                    };
                    console.log(`[PHASER] Add Directional Anim ${cfg.key}-${name}`);
                    self._scene.anims.create({
                        key: `${cfg.key}-${name}`,
                        frames: self._scene.anims.generateFrameNumbers(cfg.key, conf),
                        frameRate: 25,
                        repeat: -1,
                    });
                });
            }
            else {
                const conf = {
                    start: cfg.frameConfig.startFrame,
                    end: cfg.frameConfig.endFrame,
                };
                console.log(`[PHASER] Add Anim ${cfg.key}`);
                self._scene.anims.create({
                    key: `${cfg.key}`,
                    frames: self._scene.anims.generateFrameNumbers(cfg.key, conf),
                    frameRate: 25,
                    repeat: cfg.repeat,
                });
            }
        }
    }
    generateSpriteSheet(cfg) {
        const self = this;
        if (self._scene) {
            console.log(`[PHASER] Load Spritesheet ${cfg.key}`);
            self._scene.load.spritesheet(cfg.key, cfg.uri, cfg.frameConfig);
            if (self.created) {
                self.generateSpriteSheetDirections(cfg);
            }
        }
    }
    addSpriteSheet(key, uri, frameConfig, directional = false) {
        const cfg = {
            key: key,
            uri: uri,
            frameConfig: frameConfig,
            directional: directional,
            repeat: -1,
        };
        this.pushSpriteSheet(cfg);
    }
    addSpriteSheetConfig(key, cfg) {
        this.pushSpriteSheet({
            key: key,
            uri: cfg.uri,
            frameConfig: cfg.frameConfig,
            directional: false,
            repeat: cfg.repeat,
        });
    }
    addFigure(key, type, big = false, loaded = false) {
        const cfg = {
            key: key,
            uri: `resources/sprite/figure_${type}${loaded ? '_loaded' : ''}${big ? '_big' : ''}.png`,
            frameConfig: {
                frameWidth: big ? 76 : 38,
                frameHeight: big ? 64 : 32,
            },
            directional: true,
            repeat: -1,
        };
        this.pushSpriteSheet(cfg);
    }
    pushSpriteSheet(cfg) {
        this.spritesheetResources.push(cfg);
        if (this._scene) {
            this.generateSpriteSheet(cfg);
        }
    }
    removeSprite(ctx) {
        ctx.sprite.destroy();
        this.animatedSprites = this.animatedSprites.filter((s) => s !== ctx);
    }
    generateSprite(config) {
        if (this.scene && this.created) {
            console.log('[PHASER] Adding Sprite');
            let sprite;
            if (config.type === 'walking') {
                sprite = WalkingSprite.add(this, this.scene, config);
            }
            else {
                sprite = AnimatedSprite.add(this, this.scene, config);
            }
            if (sprite) {
                this.animatedSprites.push(sprite);
            }
            return sprite;
        }
        return undefined;
    }
    addWalkingSpriteOnTile(c, r, texture, frame, originX, originY, speed) {
        return this.addSpriteOnTile('walking', r, c, texture, frame, originX, originY, speed);
    }
    addWalkingSprite(x, y, texture, frame, originX, originY, speed) {
        return this.addSprite('walking', x, y, texture, frame, originX, originY, speed);
    }
    addAnimatedSpriteOnTile(c, r, texture, frame, originX, originY, speed) {
        return this.addSpriteOnTile('animated', r, c, texture, frame, originX, originY, speed);
    }
    addAnimatedSprite(x, y, texture, frame, originX, originY, speed) {
        return this.addSprite('animated', x, y, texture, frame, originX, originY, speed);
    }
    addSpriteOnTile(type, c, r, texture, frame, originX, originY, speed) {
        var _a;
        const tile = (_a = this.map) === null || _a === void 0 ? void 0 : _a.getTile(c, r);
        if (tile) {
            const p = tile.center;
            return this.addSprite(type, p.x, p.y, texture, frame, originX, originY, speed);
        }
        else {
            console.error(`[PHASER] Tile ${c}/${r} does not exists.`);
        }
        return undefined;
    }
    addSprite(type, x, y, texture, frame, originX, originY, speed) {
        const cfg = {
            type: type,
            x: x,
            y: y,
            texture: texture,
            frame: frame,
            originX: originX,
            originY: originY,
            speed: speed,
        };
        this.spriteConfigs.push(cfg);
        if (this.scene && this.created) {
            const s = this.generateSprite(cfg);
            return s;
        }
        return undefined;
    }
    attachMap() {
        if (this._map !== undefined) {
            console.error('Only one map per game!');
            return;
        }
        if (this.mapConfig && this.mapConfig.type === 'isometric' && this.scene && this.created) {
            console.log('[PHASER] Attaching MAP');
            this._map = new IsometricMap(this, this.scene, this.mapConfig);
        }
    }
    useIsometricMap(offsetX, offsetY, columns, rows, tileType, tileOverhang) {
        this.mapConfig = {
            type: 'isometric',
            offsetX: offsetX,
            offsetY: offsetY,
            columns: columns,
            rows: rows,
            tileType: tileType,
            tileOverhang: tileOverhang,
        };
        this.attachMap();
    }
    start(allowResize = false) {
        if (globalThis.game !== undefined) {
            console.error('Can only start once!');
            return;
        }
        const self = this;
        const sceneConfig = {
            preload: function () {
                self.preload(this);
            },
            create: function () {
                self.create(this);
            },
            update: function (time, delta) {
                self.update(this, time, delta);
            },
        };
        const config = {
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
        };
        this.game = new Phaser.Game(config);
        if (allowResize) {
            window.addEventListener('resize', this.resize.bind(this));
        }
    }
    preload(scene) {
        console.log('[PHASER] PRELOAD');
        this.onPreload(scene, this);
        this._scene = scene;
        this.imagesResources.forEach((r) => scene.load.image(r.key, r.uri));
        this.spritesheetResources.forEach((r) => this.generateSpriteSheet(r));
    }
    create(scene) {
        console.log('[PHASER] CREATE');
        scene.cameras.main.setRoundPixels(true);
        this.created = true;
        this.attachMap();
        this.spritesheetResources.forEach((r) => this.generateSpriteSheetDirections(r));
        this.spriteConfigs.forEach((c) => this.generateSprite(c));
        this.onCreate(scene, this);
    }
    update(scene, time = 0, delta = 0) {
        this.animatedSprites.forEach((s) => s.update(time, delta));
        this.onUpdate(scene, this, time, delta);
    }
    resize() {
        if (this.game === undefined) {
            return;
        }
        const w = this.domElement.width();
        const h = this.domElement.height();
        // manually resize the game with the Phaser 3.16 scalemanager
        this.game.scale.resize(w, h);
        // Check which scene is active.
        for (const scene of this.game.scene.getScenes()) {
            if (scene.scene.settings.active) {
                // Scale the camera
                scene.cameras.main.setViewport(0, 0, w, h);
                // if (scene.resizeField) {
                //     // Scale/position stuff in the scene itself with this method, that the scene must implement.
                //     scene.resizeField(w, h)
                // }
            }
        }
    }
}
class IsometricMapGame {
    constructor(columns, rows, tileConfig, figureConfigs, backgroundColor, onPreload) {
        this.columns = columns;
        this.rows = rows;
        this.tileConfig = tileConfig;
        this.figureConfigs = figureConfigs;
        this.backgroundColor = backgroundColor;
        this.onPreload = onPreload;
        this.scope = jQuery();
        this.figures = [];
        this.onCreate = () => { };
        this.onClick = () => { };
        this.onEnterTile = () => { };
        this.onLeaveTile = () => { };
        this.onFinishedWalking = () => { };
        this.update = (txt) => {
            return txt;
        };
        this.onMessage = () => { };
        this.beforeStart = () => { };
        this.whenFinished = () => { };
        this.addArgumentsTo = () => { };
        this.onUpdate = () => { };
    }
    init(canvasElement, outputElement, scope, runner) {
        console.log('[PHASER] INIT ISOMETRIC GAME');
        canvasElement.css('border', 'none');
        const self = this;
        this.scope = scope;
        const game = new Game(canvasElement, this.backgroundColor);
        this.game = game;
        this.figureConfigs
            .filter((v, i, a) => a.indexOf(v) === i)
            .forEach((cfg, idx) => {
            game.addFigure(`figure.${idx}`, cfg.type, cfg.big, cfg.loaded);
        });
        game.addImage('tile', this.tileConfig.uri);
        game.useIsometricMap(0, 30, this.columns, this.rows, 'tile');
        game.onPreload = (scene, game) => {
            if (this.onPreload) {
                this.onPreload(game, this, canvasElement, outputElement, scope, runner);
            }
        };
        game.onCreate = (scene, game) => {
            this.figures = this.figureConfigs.map((cfg, i, a) => {
                const idx = a.indexOf(cfg);
                const name = `figure.${idx}`;
                const f = game.addWalkingSpriteOnTile(0, 0, name, 0);
                f.onEnterTile = this.onEnterTile.bind(this);
                f.onLeaveTile = this.onLeaveTile.bind(this);
                f.onFinishedWalking = this.onFinishedWalking.bind(this);
                return f;
            });
            this.onCreate();
            scene.input.on('pointerdown', (e) => {
                var _a;
                const t = (_a = game.map) === null || _a === void 0 ? void 0 : _a.getTileAt(e.x, e.y);
                if (t !== undefined) {
                    this.onClick(t);
                    console.log('[PHASER] tile = ', t.column, t.row);
                    runner.postMessage('click', {
                        r: t.row,
                        c: t.column,
                    });
                }
            });
        };
        game.start(false);
    }
    update(txt, json, canvasElement, outputElement) {
        this.onUpdate(txt, json, canvasElement, outputElement);
    }
}
//# sourceMappingURL=support.js.map