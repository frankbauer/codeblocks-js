"use strict";
/// <reference path="./types/phaser.d.ts" />
const animNamesByDir = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'];
const sheetIndex = [0, 1, 3, 5, 4, 6, 7, 2];
class AnimatedSprite {
}
class WalkingSprite {
    constructor(game, sprite, config) {
        this.base_v = 5;
        this.move = undefined;
        this.sprite = sprite;
        this.game = game;
        this.animKey = config.texture;
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
    setOrigin(x, y) {
        this.sprite.setOrigin(x, y);
    }
    moveTo(x, y) {
        this.sprite.x = x;
        this.sprite.y = y;
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
    setBaseSpeed(bsp) {
        this.base_v = bsp;
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
        }
    }
}
class IsometricTile {
    constructor(map, x, y, type) {
        this.map = map;
        this.image = map.scene.add.image(x, y, type);
        console.log('[PHASER]', this.bounds);
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
        this.tileOverhang = config.tileOverhang;
        const tileSource = game.scene.textures.get(config.tileType).getSourceImage();
        this._tileWidth = tileSource.width;
        this._tileHeight = tileSource.height - this.tileOverhang;
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
        return this.tiles[r][c];
    }
}
class IsometricMap extends TiledMap {
    constructor(game, scene, config) {
        super(game, scene, config);
        const ox = config.offsetX + this._tileWidth / 2;
        const oy = config.offsetY + this.tileOverhang / 2 + (config.columns - 1) * (this._tileHeight / 2);
        for (let r = 0; r < config.rows; r++) {
            const roy = oy + (r + 1) * (this._tileHeight / 2);
            const rox = ox + r * (this._tileWidth / 2);
            for (let c = config.columns - 1; c >= 0; c--) {
                this.tiles[r][c] = new IsometricTile(this, rox + c * (this._tileWidth / 2), roy - c * (this._tileHeight / 2), config.tileType);
            }
        }
    }
}
class Game {
    constructor(domElement, backgroundColor) {
        this.created = false;
        this.walkingSprites = [];
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
            animNamesByDir.forEach((name, nr) => {
                const idx = sheetIndex[nr];
                const conf = { start: idx * 20, end: idx * 20 + 19 };
                console.log(`[PHASER] Add Anim ${cfg.key}-${name}`);
                self._scene.anims.create({
                    key: `${cfg.key}-${name}`,
                    frames: self._scene.anims.generateFrameNumbers(cfg.key, conf),
                    frameRate: 25,
                    repeat: -1,
                });
            });
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
        };
        this.spritesheetResources.push(cfg);
        if (this._scene) {
            this.generateSpriteSheet(cfg);
        }
    }
    generateWalkingSprite(config) {
        if (this.scene && this.created) {
            console.log('[PHASER] Adding Sprite');
            const ws = WalkingSprite.add(this, this.scene, config);
            if (ws) {
                this.walkingSprites.push(ws);
            }
            return ws;
        }
        return undefined;
    }
    addWalkingSprite(x, y, texture, frame, originX, originY, speed) {
        const cfg = {
            type: 'walking',
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
            const s = this.generateWalkingSprite(cfg);
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
        this.spritesheetResources
            .filter((c) => c.directional)
            .forEach((r) => this.generateSpriteSheetDirections(r));
        this.spriteConfigs
            .filter((c) => c.type === 'walking')
            .forEach((c) => this.generateWalkingSprite(c));
        this.onCreate(scene, this);
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
    update(scene, time = 0, delta = 0) {
        console.log('[PHASER] UPDATE', this.walkingSprites.length);
        // f1.update(time, delta)
        // f2.update(time, delta)
        this.walkingSprites.forEach((s) => s.update(time, delta));
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
//# sourceMappingURL=support.js.map