export default {
    // Draws 2D tile maps (de.fau.tf.lgdv.tilemap in Java), either top-down with the pixel art
    // tile sheets or isometric with pre-rendered sprites on a drawn grid. Tiles, sprites and
    // characters are described in @assets/tilemap/tilemap.json (built by art/Tiles/build_tilemap.py).
    //
    // Java talks to this library in two ways:
    //  - RPC: TILEMAP, MAPSPRITE and MAPCHARACTER objects are created through the objectManager,
    //    every method call arrives as object message, events go back to the Java objects.
    //  - Command queue: the Java program records all calls in a CommandBuffer and sends them as
    //    result (CodeBlocks.postResult). They are replayed in whenFinished().
    TYPES: ['TILEMAP', 'MAPSPRITE', 'MAPCHARACTER'],
    TILE: 16,
    // how long a character keeps its walking animation after a step, so that steps the Java
    // side sends one after the other (e.g. while a key is held) look like one movement
    WALK_GRACE_MS: 150,
    // every sprite and character animates a bit faster or slower (+-15%) and starts its
    // looping animations at a random frame, so many of them on screen do not move in sync
    TEMPO_JITTER: 0.15,
    // isometric maps: the screen direction a step into a map direction goes to
    // (column + 1 goes to the bottom right, row + 1 to the bottom left)
    ISO_SCREEN: { N: 'NE', NE: 'E', E: 'SE', SE: 'S', S: 'SW', SW: 'W', W: 'NW', NW: 'N' },
    // space around an isometric map (map pixels) for tall sprites, the sun and the coordinates
    ISO_MARGIN: { top: 70, side: 40, bottom: 16 },
    objectManager: null,
    data: null,
    dataPromise: null,
    images: new Map(),
    maps: new Map(),
    sprites: new Map(),
    characters: new Map(),
    currentMap: null,
    canvas: null,
    ctx: null,
    frameId: null,
    resizeObserver: null,
    active: false,
    kindOf: [],
    pathTiles: new Set(),
    tileById: new Map(),

    create(context) {
        this.objectManager = context['objectManager'] ?? null
        this.maps = new Map()
        this.sprites = new Map()
        this.characters = new Map()
        this.currentMap = null
        this.dataPromise = null
        this._loadData()

        if (this.objectManager) {
            this.objectManager.registerType('TILEMAP', (attrs, ready, error) =>
                this._createMap(attrs, ready, error, true)
            )
            this.objectManager.registerType('MAPSPRITE', (attrs, ready, error) =>
                this._createSprite(attrs, ready, error, true)
            )
            this.objectManager.registerType('MAPCHARACTER', (attrs, ready, error) =>
                this._createCharacter(attrs, ready, error, true)
            )
        } else {
            console.info(
                'tileMap: no objectManager above this library, only the command queue (CommandBuffer) is available.'
            )
        }

        return {
            // Promise of the parsed tilemap.json
            ready: () => this._loadData(),
            getDescription: () => this.data,
            // the map that is shown (the last one created)
            getMap: () => this.currentMap,
            // replays recorded commands, e.g. the result of a CommandBuffer
            replay: (commands) => this._replay(commands),
            // map cell below a point in client coordinates, or null
            cellAt: (clientX, clientY) => this._cellAt(clientX, clientY),
        }
    },

    // ------------------------------------------------------------------ lifecycle

    setupDOM() {
        if (this.canvasElement.css('position') === 'static') {
            this.canvasElement.css('position', 'relative')
        }
        // on top of the canvasManager canvases, input events pass through to them
        this.canvas = $(document.createElement('canvas')).addClass('tileMap-canvas').css({
            position: 'absolute',
            left: 0,
            top: 0,
            width: '100%',
            height: '100%',
            'pointer-events': 'none',
            'image-rendering': 'pixelated',
        })
        this.canvasElement.append(this.canvas)
        this.ctx = this.canvas[0].getContext('2d')

        if (window.ResizeObserver) {
            this.resizeObserver?.disconnect()
            this.resizeObserver = new ResizeObserver(() => this._resize())
            this.resizeObserver.observe(this.canvasElement[0])
        }
        this.canvasElement.off('click.tileMap').on('click.tileMap', (e) => this._onClick(e))
        this._resize()
    },

    beforeStart() {
        this.active = true
        this.maps.clear()
        this.sprites.clear()
        this.characters.clear()
        this.currentMap = null
        this._stopLoop()
        this._render(performance.now())
    },

    afterStop() {
        // no more events for the worker. The map stays, animations and queued moves go on.
        this.active = false
        this.characters.forEach((ch) => {
            ch.idleWaiters = []
        })
    },

    whenFinished(args, resultData) {
        if (Array.isArray(resultData)) {
            const commands = resultData.filter(
                (c) => c && c.object && this.TYPES.includes(c.object.type)
            )
            if (commands.length > 0) {
                this._replay(commands)
            }
        }
    },

    // ------------------------------------------------------------------ description

    _resolve(url) {
        return url.startsWith('@assets/')
            ? (this.ASSETS_URL ?? 'assets/') + url.substring('@assets/'.length)
            : url
    },

    _loadData() {
        if (!this.dataPromise) {
            const url = this._resolve('@assets/tilemap/tilemap.json')
            this.baseUrl = url.substring(0, url.lastIndexOf('/') + 1)
            this.dataPromise = fetch(url)
                .then((r) => {
                    if (!r.ok) {
                        throw new Error('HTTP ' + r.status)
                    }
                    return r.json()
                })
                .then((data) => {
                    this.data = data
                    this.kindOf = []
                    this.tileById = new Map()
                    this.pathTiles = new Set()
                    data.tiles.forEach((t) => {
                        this.tileById.set(t.id, t)
                        this.kindOf[t.id] = t.layer === 'terrain' ? t.kind : null
                        if (t.group === 'path') {
                            this.pathTiles.add(t.id)
                        }
                    })
                    return data
                })
                .catch((e) => {
                    console.error('tileMap: failed to load', url, e)
                    this.dataPromise = null
                    throw e
                })
        }
        return this.dataPromise
    },

    _image(path) {
        const url = this.baseUrl + path
        let entry = this.images.get(url)
        if (!entry) {
            const img = new Image()
            entry = { img, loaded: false }
            entry.promise = new Promise((resolve, reject) => {
                img.onload = () => {
                    entry.loaded = true
                    // static layers drawn before the image was there need a redraw
                    this.maps.forEach((m) => (m.dirty = true))
                    resolve(img)
                }
                img.onerror = () => reject(new Error('Failed to load ' + url))
            })
            entry.promise.catch((e) => console.error('tileMap:', e.message))
            img.src = url
            this.images.set(url, entry)
        }
        return entry
    },

    _themeOf(map) {
        const themes = this.data.themes
        return themes[map.theme] ? map.theme : this.data.defaultTheme
    },

    _isIso(map) {
        return map.projection === 'isometric'
    },

    // colors of an isometric map
    _isoTheme(map) {
        const themes = this.data.isometric.themes
        return themes[map.theme] ?? themes[this.data.defaultTheme]
    },

    // sprite or character definition, with the overrides of the map's theme
    _definition(kind, name, map) {
        const def = this.data[kind][name]
        if (!def) {
            return null
        }
        const override = def.themes?.[this._themeOf(map)]
        return override ? { ...def, ...override } : def
    },

    // ------------------------------------------------------------------ object creation

    _createMap(attrs, ready, error, live) {
        const n = attrs.columns * attrs.rows
        const map = {
            id: attrs.id,
            live,
            theme: attrs.theme,
            projection: attrs.projection === 'isometric' ? 'isometric' : 'topdown',
            columns: attrs.columns,
            rows: attrs.rows,
            terrain: this._cells(attrs.terrain, n, 1),
            decorations: this._cells(attrs.decorations, n, 0),
            fog: this._cells(attrs.fog, n, 0),
            autoTiling: attrs.autoTiling !== false,
            zoom: +attrs.zoom || 0,
            followId: -1,
            grid: false,
            coordinates: false,
            clicks: false,
            dirty: true,
            fogDirty: true,
            layer: null,
            fogLayer: null,
            // fading effects (sun rays, flashing cells) and tinted cells
            effects: [],
            tints: new Map(),
        }
        this.maps.set(map.id, map)
        this.currentMap = map
        this._loadData()
            .then(() =>
                this._isIso(map)
                    ? null
                    : this._image(this.data.themes[this._themeOf(map)].image).promise
            )
            .then(() => ready({ columns: map.columns, rows: map.rows }))
            .catch((e) => error({ message: e.message }))
        this._startLoop()
        return {
            map,
            onMessage: (cmd, data) => this._mapMessage(map, cmd, data || {}),
        }
    },

    _cells(values, n, fill) {
        const a = new Int32Array(n).fill(fill)
        if (Array.isArray(values)) {
            for (let i = 0; i < n && i < values.length; i++) {
                a[i] = values[i] | 0
            }
        }
        return a
    },

    _createSprite(attrs, ready, error, live) {
        const sprite = {
            id: attrs.id,
            live,
            mapId: attrs.map,
            name: attrs.sprite,
            col: attrs.col | 0,
            row: attrs.row | 0,
            variant: attrs.variant | 0,
            glide: null,
            visible: true,
            depth: 0,
            anim: null,
            // shown while no animation plays, null: the sprite's default frame
            frame: null,
            ...this._randomTiming(),
        }
        this.sprites.set(sprite.id, sprite)
        this._loadData()
            .then(() => {
                const map = this.maps.get(sprite.mapId)
                const def = map ? this._definition('sprites', sprite.name, map) : null
                if (!def) {
                    throw new Error('Unknown sprite ' + sprite.name + ' or map #' + sprite.mapId)
                }
                if (def.default && sprite.anim === null && sprite.frame === null) {
                    this._play(sprite, def, def.default, undefined)
                }
                return def.image ? this._image(def.image).promise : null
            })
            .then(() => ready())
            .catch((e) => {
                this.sprites.delete(sprite.id)
                error({ message: e.message })
            })
        return {
            sprite,
            onMessage: (cmd, data) => this._spriteMessage(sprite, cmd, data || {}),
        }
    },

    _createCharacter(attrs, ready, error, live) {
        const ch = {
            id: attrs.id,
            live,
            mapId: attrs.map,
            name: attrs.character,
            col: attrs.col | 0,
            row: attrs.row | 0,
            // position on the way between two cells
            fc: attrs.col | 0,
            fr: attrs.row | 0,
            dir: attrs.dir || 'S',
            speed: +attrs.speed > 0 ? +attrs.speed : 3,
            queue: [],
            current: null,
            clock: 0,
            busy: false,
            walkStart: 0,
            lastWalk: -Infinity,
            idleStart: performance.now(),
            visible: true,
            idleWaiters: [],
            ...this._randomTiming(),
        }
        this.characters.set(ch.id, ch)
        this._loadData()
            .then(() => {
                const def = this.data.characters[ch.name]
                if (!def) {
                    throw new Error('Unknown character ' + ch.name)
                }
                return this._image(def.image).promise
            })
            .then(() => ready())
            .catch((e) => {
                this.characters.delete(ch.id)
                error({ message: e.message })
            })
        return {
            character: ch,
            onMessage: (cmd, data) => this._characterMessage(ch, cmd, data || {}),
            onQuery: (cmd, data, reply) => {
                if (cmd === 'whenIdle') {
                    if (!ch.busy && ch.queue.length === 0 && !ch.current) {
                        reply({})
                    } else {
                        ch.idleWaiters.push(reply)
                    }
                } else {
                    reply({})
                }
            },
        }
    },

    // ------------------------------------------------------------------ command queue

    _replay(commands) {
        return this._loadData().then(() => {
            const handlers = new Map()
            const noop = () => {}
            const fail = (e) => console.error('tileMap: replay failed', e)
            commands.forEach((entry) => {
                const obj = entry.object
                if (!obj || !this.TYPES.includes(obj.type)) {
                    return
                }
                if (entry.command === 'new') {
                    const attrs = { ...obj }
                    const factory =
                        obj.type === 'TILEMAP'
                            ? this._createMap
                            : obj.type === 'MAPSPRITE'
                              ? this._createSprite
                              : this._createCharacter
                    handlers.set(obj.id, factory.call(this, attrs, noop, fail, false))
                } else {
                    const handler = handlers.get(obj.id)
                    if (!handler) {
                        console.warn('tileMap: command for unknown object', entry)
                        return
                    }
                    const { command, object, ...data } = entry
                    handler.onMessage(command, data)
                }
            })
        })
    },

    // ------------------------------------------------------------------ messages

    _mapMessage(map, cmd, data) {
        const n = map.columns * map.rows
        const inside = (c, r) => c >= 0 && r >= 0 && c < map.columns && r < map.rows
        const now = performance.now()
        switch (cmd) {
            case 'setTerrain':
                if (inside(data.col, data.row)) {
                    map.terrain[data.row * map.columns + data.col] = data.tile | 0
                }
                map.dirty = true
                break
            case 'setTerrainAll':
                map.terrain = this._cells(data.tiles, n, 1)
                map.dirty = true
                break
            case 'setDecoration':
                if (inside(data.col, data.row)) {
                    map.decorations[data.row * map.columns + data.col] = data.tile | 0
                }
                map.dirty = true
                break
            case 'setDecorationsAll':
                map.decorations = this._cells(data.tiles, n, 0)
                map.dirty = true
                break
            case 'setFog':
                if (inside(data.col, data.row)) {
                    map.fog[data.row * map.columns + data.col] = data.level | 0
                }
                map.fogDirty = true
                break
            case 'setFogAll':
                map.fog = this._cells(data.tiles, n, 0)
                map.fogDirty = true
                break
            case 'reveal': {
                const rad = data.radius | 0
                for (let r = data.row - rad; r <= data.row + rad; r++) {
                    for (let c = data.col - rad; c <= data.col + rad; c++) {
                        const d2 = (c - data.col) ** 2 + (r - data.row) ** 2
                        if (inside(c, r) && d2 <= rad * rad + rad) {
                            map.fog[r * map.columns + c] = 0
                        }
                    }
                }
                map.fogDirty = true
                break
            }
            case 'setTheme':
                map.theme = data.theme
                if (!this._isIso(map)) {
                    this._loadData().then(() =>
                        this._image(this.data.themes[this._themeOf(map)].image)
                    )
                }
                map.dirty = map.fogDirty = true
                break
            case 'setAutoTiling':
                map.autoTiling = data.enabled !== false
                map.dirty = map.fogDirty = true
                break
            case 'setZoom':
                map.zoom = Math.max(0, +data.zoom || 0)
                break
            case 'follow':
                map.followId = data.character ?? -1
                break
            case 'showGrid':
                map.grid = !!data.visible
                break
            case 'showCoordinates':
                map.coordinates = !!data.visible
                break
            case 'listenClicks':
                map.clicks = !!data.enabled
                break
            case 'sunRay':
                map.effects.push({
                    type: 'sun',
                    col: data.col | 0,
                    row: data.row | 0,
                    start: now,
                    duration: (+data.seconds || 2.2) * 1000,
                })
                break
            case 'flash':
                map.effects.push({
                    type: 'flash',
                    col: data.col | 0,
                    row: data.row | 0,
                    color: data.color || 'rgba(255,225,60,1)',
                    start: now,
                    duration: (+data.seconds || 0.6) * 1000,
                })
                break
            case 'tint':
                if (inside(data.col, data.row)) {
                    const key = data.row * map.columns + data.col
                    if (data.color) {
                        map.tints.set(key, {
                            color: data.color,
                            start: now,
                            duration: Math.max(0, +data.seconds || 0) * 1000,
                        })
                    } else {
                        map.tints.delete(key)
                    }
                }
                break
            case 'clearTints':
                map.tints.clear()
                break
            default:
                console.warn('tileMap: unknown map command', cmd)
        }
    },

    _spriteMessage(sprite, cmd, data) {
        const now = performance.now()
        const map = this.maps.get(sprite.mapId)
        const def = map && this.data ? this._definition('sprites', sprite.name, map) : null
        switch (cmd) {
            case 'setPosition':
                sprite.glide = null
                sprite.col = data.col | 0
                sprite.row = data.row | 0
                break
            case 'moveTo': {
                const from = this._spritePos(sprite, now)
                sprite.glide = {
                    fromCol: from.col,
                    fromRow: from.row,
                    start: now,
                    duration: Math.max(0, +data.seconds || 0) * 1000,
                }
                sprite.col = data.col | 0
                sprite.row = data.row | 0
                break
            }
            case 'play':
                if (def) {
                    this._play(sprite, def, data.animation || def.default || 'loop', data.loop)
                }
                break
            case 'stop':
                if (def) {
                    sprite.frame = this._spriteFrame(sprite, def, now) ?? def.frame ?? 0
                }
                sprite.anim = null
                break
            case 'setFrame':
                sprite.anim = null
                sprite.frame = Math.max(0, data.frame | 0)
                break
            case 'setVariant':
                sprite.variant = Math.max(0, data.variant | 0)
                break
            case 'setVisible':
                sprite.visible = data.visible !== false
                break
            case 'setDepth':
                sprite.depth = +data.depth || 0
                break
            case 'remove':
                this.sprites.delete(sprite.id)
                if (sprite.live) {
                    this.objectManager?.delete(sprite.id, 'MAPSPRITE')
                }
                break
            default:
                console.warn('tileMap: unknown sprite command', cmd)
        }
    },

    _characterMessage(ch, cmd, data) {
        switch (cmd) {
            case 'walk':
                ;(data.steps || []).forEach((s) =>
                    ch.queue.push({ type: 'step', col: s.col | 0, row: s.row | 0, dir: s.dir })
                )
                break
            case 'face':
            case 'teleport':
            case 'setSpeed':
                ch.queue.push({ type: cmd, ...data })
                break
            case 'pause':
                ch.queue.push({ type: 'pause', ms: Math.max(0, +data.seconds || 0) * 1000 })
                break
            case 'cancel':
                ch.queue = []
                break
            case 'setVisible':
                ch.visible = data.visible !== false
                break
            case 'remove':
                this.characters.delete(ch.id)
                if (ch.live) {
                    this.objectManager?.delete(ch.id, 'MAPCHARACTER')
                }
                break
            default:
                console.warn('tileMap: unknown character command', cmd)
                return
        }
        this._startLoop()
    },

    _send(obj, type, cmd, payload) {
        if (obj.live && this.active && this.runner) {
            this.runner.postMessage('o', {
                json: JSON.stringify(payload),
                objid: obj.id,
                type,
                cmd,
            })
        }
    },

    // ------------------------------------------------------------------ animation

    _play(sprite, def, name, loop) {
        const anim = def.animations?.[name]
        if (!anim) {
            console.warn('tileMap: sprite', sprite.name, 'has no animation', name)
            return
        }
        sprite.anim = {
            name,
            from: anim.from,
            to: anim.to,
            loop: loop === undefined ? anim.loop : !!loop,
            start: performance.now(),
            ended: false,
        }
        this._startLoop()
    },

    _randomTiming() {
        return {
            tempo: 1 + (Math.random() * 2 - 1) * this.TEMPO_JITTER,
            phase: Math.random(),
        }
    },

    _frameDuration(def, f) {
        return def.durations?.[f] || def.frameDuration || 100
    },

    // frame of an animation (from..to with per frame durations) `elapsed` ms after its start.
    // `obj` (sprite or character) scales the speed with its tempo; looping animations start
    // at its phase (fraction of one loop).
    _animFrame(def, from, to, elapsed, loop, obj) {
        let total = 0
        for (let f = from; f <= to; f++) {
            total += this._frameDuration(def, f)
        }
        if (total <= 0) {
            return { frame: from, done: true }
        }
        let t = elapsed * (obj?.tempo ?? 1)
        if (loop && obj) {
            t += obj.phase * total
        }
        if (t >= total) {
            if (!loop) {
                return { frame: to, done: true }
            }
            t %= total
        }
        for (let f = from; f <= to; f++) {
            t -= this._frameDuration(def, f)
            if (t < 0) {
                return { frame: f, done: false }
            }
        }
        return { frame: to, done: false }
    },

    // frame of the sprite within its variant, null: nothing to draw (the pause of an animation)
    _spriteFrame(sprite, def, now) {
        if (!sprite.anim) {
            const frames = def.variantFrames || def.frames || 1
            return Math.min(sprite.frame ?? def.frame ?? 0, frames - 1)
        }
        const a = sprite.anim
        const pause = a.loop && def.animations?.[a.name]?.pause
        if (pause) {
            return this._pausedFrame(sprite, def, a, pause, now)
        }
        const { frame, done } = this._animFrame(def, a.from, a.to, now - a.start, a.loop, sprite)
        if (done && !a.ended) {
            a.ended = true
            this._send(sprite, 'MAPSPRITE', 'ended', { animation: a.name })
        }
        return frame
    },

    // a looping animation with `pause` plays once, then waits a random time (`delay`, ms) showing
    // `pause.frame` (null: nothing) before it plays again, like the blinking of the HERO
    _pausedFrame(sprite, def, a, pause, now) {
        const [minDelay, maxDelay] = pause.delay || [2000, 6000]
        const wait = () => minDelay + Math.random() * (maxDelay - minDelay)
        if (a.runAt === undefined) {
            // the first run after a random part of a pause, so many sprites do not start together
            a.runAt = a.start + Math.random() * wait()
        }
        let total = 0
        for (let f = a.from; f <= a.to; f++) {
            total += this._frameDuration(def, f)
        }
        const t = now - a.runAt
        if (t >= 0 && t < total) {
            return this._animFrame(def, a.from, a.to, t, false, null).frame
        }
        if (t >= total) {
            a.runAt = now + wait()
        }
        return pause.frame ?? null
    },

    _spritePos(sprite, now) {
        const g = sprite.glide
        if (!g) {
            return { col: sprite.col, row: sprite.row }
        }
        const t = g.duration > 0 ? Math.min(1, (now - g.start) / g.duration) : 1
        if (t >= 1) {
            sprite.glide = null
        }
        return {
            col: g.fromCol + (sprite.col - g.fromCol) * t,
            row: g.fromRow + (sprite.row - g.fromRow) * t,
        }
    },

    // advances the move queue of a character up to `now`
    _updateCharacter(ch, now) {
        for (let guard = 0; guard < 1000; guard++) {
            if (!ch.current) {
                if (ch.queue.length === 0) {
                    break
                }
                const item = ch.queue.shift()
                // continue seamlessly where the last item ended, unless the queue ran empty
                const start = ch.busy ? Math.max(ch.clock, now - 1000) : now
                ch.busy = true
                if (item.type === 'step') {
                    const dist = Math.hypot(item.col - ch.col, item.row - ch.row) || 1
                    if (now - ch.lastWalk > this.WALK_GRACE_MS) {
                        ch.walkStart = start
                    }
                    ch.current = {
                        type: 'step',
                        fromC: ch.fc,
                        fromR: ch.fr,
                        col: item.col,
                        row: item.row,
                        start,
                        duration: (dist / ch.speed) * 1000,
                    }
                    ch.dir = item.dir || ch.dir
                } else if (item.type === 'pause') {
                    ch.current = { type: 'pause', start, duration: item.ms }
                } else {
                    if (item.type === 'face') {
                        ch.dir = item.dir || ch.dir
                    }
                    if (item.type === 'setSpeed') {
                        ch.speed = +item.speed > 0 ? +item.speed : ch.speed
                    }
                    if (item.type === 'teleport') {
                        ch.col = ch.fc = item.col | 0
                        ch.row = ch.fr = item.row | 0
                    }
                    ch.clock = start
                    continue
                }
            }
            const cur = ch.current
            const t = cur.duration > 0 ? (now - cur.start) / cur.duration : 1
            if (cur.type === 'step') {
                const k = Math.max(0, Math.min(1, t))
                ch.fc = cur.fromC + (cur.col - cur.fromC) * k
                ch.fr = cur.fromR + (cur.row - cur.fromR) * k
                cur.progress = k
                ch.lastWalk = now
            }
            if (t < 1) {
                break
            }
            ch.clock = cur.start + cur.duration
            ch.current = null
            if (cur.type === 'step') {
                ch.col = ch.fc = cur.col
                ch.row = ch.fr = cur.row
                this._send(ch, 'MAPCHARACTER', 'step', { col: ch.col, row: ch.row })
            }
        }
        if (ch.busy && !ch.current && ch.queue.length === 0) {
            ch.busy = false
            ch.idleStart = now
            this._send(ch, 'MAPCHARACTER', 'idle', { col: ch.col, row: ch.row })
            const waiters = ch.idleWaiters
            ch.idleWaiters = []
            waiters.forEach((reply) => reply({ col: ch.col, row: ch.row }))
        }
    },

    // animation of a character for its current direction. `screenDirections` (isometric art)
    // is keyed by the direction on screen, `directions` by the direction on the map.
    _directionAnimation(ch, def, map) {
        if (def.screenDirections) {
            const screen = this._isIso(map) ? this.ISO_SCREEN[ch.dir] : ch.dir
            return def.screenDirections[screen] || def.screenDirections.S
        }
        return def.directions[ch.dir] || def.directions.S
    },

    _characterFrame(ch, def, map, now) {
        const anim = def.animations[this._directionAnimation(ch, def, map)]
        if (def.syncToStep) {
            // one run of the animation per step (e.g. a hop), first frame while standing
            const step = ch.current?.type === 'step' ? ch.current : null
            if (!step) {
                return anim.from
            }
            const n = anim.to - anim.from + 1
            return anim.from + Math.min(n - 1, Math.floor((step.progress ?? 0) * n))
        }
        const walking = ch.current?.type === 'step' || now - ch.lastWalk <= this.WALK_GRACE_MS
        if (!walking && def.idle && def.blink) {
            return this._blinkFrame(ch, def, now)
        }
        if (!walking && def.idle) {
            const idle = def.animations[def.idle]
            return this._animFrame(def, idle.from, idle.to, now - ch.idleStart, true, ch).frame
        }
        return this._animFrame(def, anim.from, anim.to, now - ch.walkStart, true, ch).frame
    },

    // standing with `blink`: the first idle frame (eyes open), after a random pause the blink
    // sequence (frames relative to the idle animation) plays once, sometimes twice in a row
    _blinkFrame(ch, def, now) {
        const idle = def.animations[def.idle]
        const blink = def.blink
        const [minDelay, maxDelay] = blink.delay || [2000, 6000]
        if (!ch.blinkAt || ch.blinkAt < ch.idleStart) {
            ch.blinkAt = ch.idleStart + minDelay + Math.random() * (maxDelay - minDelay)
        }
        const t = now - ch.blinkAt
        if (t < 0) {
            return idle.from
        }
        let rest = t
        for (let i = 0; i < blink.sequence.length; i++) {
            rest -= blink.durations?.[i] ?? 80
            if (rest < 0) {
                return Math.min(idle.from + blink.sequence[i], idle.to)
            }
        }
        // blink done: next one right away (blinking twice) or after a new pause
        const again = Math.random() < (blink.twice ?? 0)
        ch.blinkAt = now + (again ? 180 : minDelay + Math.random() * (maxDelay - minDelay))
        return idle.from
    },

    // ------------------------------------------------------------------ auto tiling

    _isLand(map, c, r) {
        if (c < 0 || r < 0 || c >= map.columns || r >= map.rows) {
            return false
        }
        return this.kindOf[map.terrain[r * map.columns + c]] === 'land'
    },

    _terrainTile(map, c, r) {
        const tile = map.terrain[r * map.columns + c]
        const coast = this.data.autotiles.coast
        if (!map.autoTiling || !coast.appliesTo.includes(tile)) {
            return tile
        }
        const land = (dc, dr) => this._isLand(map, c + dc, r + dr)
        const n = land(0, -1)
        const e = land(1, 0)
        const s = land(0, 1)
        const w = land(-1, 0)
        const parts = []
        if (n) {
            parts.push('N')
        }
        if (e) {
            parts.push('E')
        }
        if (s) {
            parts.push('S')
        }
        if (w) {
            parts.push('W')
        }
        if (!n && !e && land(1, -1)) {
            parts.push('NE')
        }
        if (!s && !e && land(1, 1)) {
            parts.push('SE')
        }
        if (!s && !w && land(-1, 1)) {
            parts.push('SW')
        }
        if (!n && !w && land(-1, -1)) {
            parts.push('NW')
        }
        return coast.tiles[parts.join(' ')] ?? coast.fallback
    },

    _decorationTile(map, c, r) {
        const tile = map.decorations[r * map.columns + c]
        const path = this.data.autotiles.path
        if (!map.autoTiling || !path.appliesTo.includes(tile)) {
            return tile
        }
        const isPath = (dc, dr) => {
            const cc = c + dc
            const rr = r + dr
            if (cc < 0 || rr < 0 || cc >= map.columns || rr >= map.rows) {
                return false
            }
            return this.pathTiles.has(map.decorations[rr * map.columns + cc])
        }
        const parts = []
        if (isPath(0, -1)) {
            parts.push('N')
        }
        if (isPath(1, 0)) {
            parts.push('E')
        }
        if (isPath(0, 1)) {
            parts.push('S')
        }
        if (isPath(-1, 0)) {
            parts.push('W')
        }
        return path.tiles[parts.join(' ')] ?? tile
    },

    _fogTile(map, c, r) {
        const level = map.fog[r * map.columns + c]
        const def = this.data.autotiles.fog.levels[level]
        if (!def) {
            return -1
        }
        const fogged = (dc, dr) => {
            const cc = c + dc
            const rr = r + dr
            if (cc < 0 || rr < 0 || cc >= map.columns || rr >= map.rows) {
                return true
            }
            return map.fog[rr * map.columns + cc] > 0
        }
        const n = fogged(0, -1)
        const e = fogged(1, 0)
        const s = fogged(0, 1)
        const w = fogged(-1, 0)
        if ((!n && !s) || (!e && !w)) {
            return def.single[(c * 7 + r * 13) % def.single.length]
        }
        return def.frame[!n ? 0 : !s ? 2 : 1][!w ? 0 : !e ? 2 : 1]
    },

    // ------------------------------------------------------------------ projection

    // size of the map in map pixels and the origin of the isometric grid
    _world(map) {
        if (!this._isIso(map)) {
            return { width: map.columns * this.TILE, height: map.rows * this.TILE }
        }
        const { tileWidth: tw, tileHeight: th } = this.data.isometric
        const m = this.ISO_MARGIN
        const span = map.columns + map.rows
        return {
            width: (span * tw) / 2 + 2 * m.side,
            height: m.top + (span * th) / 2 + m.bottom,
            ox: m.side + (map.rows * tw) / 2,
            oy: m.top,
        }
    },

    // map pixel of the center of a (fractional) cell
    _ground(map, world, c, r) {
        if (!this._isIso(map)) {
            const T = this.TILE
            return { x: (c + 0.5) * T, y: (r + 0.5) * T }
        }
        const { tileWidth: tw, tileHeight: th } = this.data.isometric
        return { x: world.ox + ((c - r) * tw) / 2, y: world.oy + ((c + r) * th) / 2 + th / 2 }
    },

    // outline of a cell (rectangle or diamond), `inset` map pixels smaller
    _cellPath(ctx, map, world, c, r, inset = 0) {
        ctx.beginPath()
        if (!this._isIso(map)) {
            const T = this.TILE
            ctx.rect(c * T + inset, r * T + inset, T - 2 * inset, T - 2 * inset)
            return
        }
        const { tileWidth: tw, tileHeight: th } = this.data.isometric
        const m = this._ground(map, world, c, r)
        ctx.moveTo(m.x, m.y - th / 2 + inset)
        ctx.lineTo(m.x + tw / 2 - 2 * inset, m.y)
        ctx.lineTo(m.x, m.y + th / 2 - inset)
        ctx.lineTo(m.x - tw / 2 + 2 * inset, m.y)
        ctx.closePath()
    },

    // ------------------------------------------------------------------ rendering

    _sheetTile(ctx, sheet, id, x, y) {
        if (id < 0) {
            return
        }
        const cols = this.data.sheet.columns
        const T = this.TILE
        ctx.drawImage(sheet, (id % cols) * T, Math.floor(id / cols) * T, T, T, x, y, T, T)
    },

    // draws frame `frame` of a sheet image (frames numbered row by row)
    _drawFrame(ctx, def, img, frame, x, y) {
        const fw = def.frameWidth
        const fh = def.frameHeight
        const cols = def.columns || def.frames || 1
        ctx.drawImage(img, (frame % cols) * fw, Math.floor(frame / cols) * fh, fw, fh, x, y, fw, fh)
    },

    _layerCanvas(map, key) {
        const w = map.columns * this.TILE
        const h = map.rows * this.TILE
        let c = map[key]
        if (!c || c.width !== w || c.height !== h) {
            c = document.createElement('canvas')
            c.width = w
            c.height = h
            map[key] = c
        }
        return c
    },

    // terrain and decorations of a top-down map, drawn once at 1:1 and redrawn when they change
    _updateLayers(map) {
        const sheet = this._image(this.data.themes[this._themeOf(map)].image)
        if (!sheet.loaded) {
            return false
        }
        const T = this.TILE
        if (map.dirty) {
            const layer = this._layerCanvas(map, 'layer')
            const ctx = layer.getContext('2d')
            ctx.clearRect(0, 0, layer.width, layer.height)
            for (let r = 0; r < map.rows; r++) {
                for (let c = 0; c < map.columns; c++) {
                    this._sheetTile(ctx, sheet.img, this._terrainTile(map, c, r), c * T, r * T)
                    const deco = this._decorationTile(map, c, r)
                    if (deco > 0) {
                        this._sheetTile(ctx, sheet.img, deco, c * T, r * T)
                    }
                }
            }
            map.dirty = false
        }
        if (map.fogDirty) {
            const layer = this._layerCanvas(map, 'fogLayer')
            const ctx = layer.getContext('2d')
            ctx.clearRect(0, 0, layer.width, layer.height)
            map.hasFog = false
            for (let r = 0; r < map.rows; r++) {
                for (let c = 0; c < map.columns; c++) {
                    if (map.fog[r * map.columns + c] > 0) {
                        this._sheetTile(ctx, sheet.img, this._fogTile(map, c, r), c * T, r * T)
                        map.hasFog = true
                    }
                }
            }
            map.fogDirty = false
        }
        return true
    },

    // the isometric ground: a diamond per cell, land and water in two alternating colors
    _drawIsoGround(ctx, map, world, view) {
        const colors = this._isoTheme(map)
        ctx.lineWidth = 1 / view.scale
        ctx.strokeStyle = colors.outline
        for (let r = 0; r < map.rows; r++) {
            for (let c = 0; c < map.columns; c++) {
                const kind = this.kindOf[map.terrain[r * map.columns + c]] ?? 'land'
                const pair = colors[kind] ?? colors.land
                this._cellPath(ctx, map, world, c, r)
                ctx.fillStyle = pair[(r + c) % 2]
                ctx.fill()
                ctx.stroke()
            }
        }
    },

    // scale (device pixels per map pixel) and camera (map pixel shown at the top left)
    _layout(map) {
        const cw = this.canvas[0].width
        const ch = this.canvas[0].height
        const dpr = window.devicePixelRatio || 1
        const world = this._world(map)
        const iso = this._isIso(map)
        let scale
        if (map.zoom > 0) {
            scale = map.zoom * dpr
        } else {
            scale = Math.min(cw / world.width, ch / world.height)
            // whole multiples keep the pixel art even, below 2x the map rather fills the view
            if (!iso && scale >= 2) {
                scale = Math.floor(scale)
            }
        }
        const vw = cw / scale
        const vh = ch / scale
        const follow = map.followId >= 0 ? this.characters.get(map.followId) : null
        const center = follow
            ? this._ground(map, world, follow.fc, follow.fr)
            : { x: world.width / 2, y: world.height / 2 }
        const camera = (size, viewSize, c) => {
            if (size <= viewSize) {
                return (size - viewSize) / 2
            }
            return Math.max(0, Math.min(size - viewSize, c - viewSize / 2))
        }
        const x = camera(world.width, vw, center.x)
        const y = camera(world.height, vh, center.y)
        // whole device pixels, so the tiles stay crisp
        return {
            world,
            scale,
            x: Math.round(x * scale) / scale,
            y: Math.round(y * scale) / scale,
        }
    },

    _render(now) {
        if (!this.ctx || !this.canvas) {
            return false
        }
        const ctx = this.ctx
        const canvas = this.canvas[0]
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        const map = this.currentMap
        if (!map || !this.data) {
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            return !!map
        }
        const iso = this._isIso(map)
        this.characters.forEach((ch) => {
            if (ch.mapId === map.id) {
                this._updateCharacter(ch, now)
            }
        })

        ctx.fillStyle = iso
            ? this._isoTheme(map).background
            : this.data.themes[this._themeOf(map)].background
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        if (!iso && !this._updateLayers(map)) {
            return true
        }

        const view = this._layout(map)
        const world = view.world
        ctx.imageSmoothingEnabled = iso
        ctx.setTransform(view.scale, 0, 0, view.scale, -view.x * view.scale, -view.y * view.scale)
        if (iso) {
            this._drawIsoGround(ctx, map, world, view)
        } else {
            ctx.drawImage(map.layer, 0, 0)
        }
        map.effects = map.effects.filter((e) => now - e.start < e.duration)
        this._drawCellEffects(ctx, map, world, now)

        const T = this.TILE
        const sheet = iso ? null : this._image(this.data.themes[this._themeOf(map)].image).img
        const drawables = []
        this.sprites.forEach((sprite) => {
            if (sprite.mapId !== map.id || !sprite.visible) {
                return
            }
            const def = this._definition('sprites', sprite.name, map)
            if (!def) {
                return
            }
            const pos = this._spritePos(sprite, now)
            const fp = def.footprint || [1, 1]
            const ground = this._ground(
                map,
                world,
                pos.col + (fp[0] - 1) / 2,
                pos.row + (fp[1] - 1) / 2
            )
            drawables.push({
                key: iso ? ground.y : (pos.row + fp[1]) * T,
                x: ground.x,
                depth: sprite.depth,
                order: 0,
                id: sprite.id,
                draw: () => this._drawSprite(ctx, map, sprite, def, pos, ground, sheet, now),
            })
        })
        this.characters.forEach((ch) => {
            if (ch.mapId !== map.id || !ch.visible) {
                return
            }
            const def = this.data.characters[ch.name]
            if (!def) {
                return
            }
            const ground = this._ground(map, world, ch.fc, ch.fr)
            drawables.push({
                key: iso ? ground.y : (ch.fr + 1) * T,
                x: ground.x,
                depth: 0,
                order: 1,
                id: ch.id,
                draw: () => {
                    const img = this._image(def.image)
                    if (!img.loaded) {
                        return
                    }
                    const frame = this._characterFrame(ch, def, map, now)
                    let x, y
                    if (def.anchor) {
                        x = ground.x - def.anchor[0]
                        y = ground.y - def.anchor[1]
                    } else {
                        x = Math.round(ch.fc * T + (T - def.frameWidth) / 2)
                        y = Math.round(ch.fr * T + T - def.frameHeight)
                    }
                    this._drawFrame(ctx, def, img.img, frame, x, y)
                },
            })
        })
        drawables.sort(
            (a, b) =>
                a.key - b.key || a.depth - b.depth || a.x - b.x || a.order - b.order || a.id - b.id
        )
        drawables.forEach((d) => d.draw())

        if (map.hasFog && !iso) {
            ctx.drawImage(map.fogLayer, 0, 0)
        }
        this._drawSuns(ctx, map, world, view, now)
        if (map.grid) {
            this._drawGrid(ctx, map, view)
        }
        if (map.coordinates) {
            this._drawCoordinates(ctx, map, view)
        }
        return true
    },

    _drawSprite(ctx, map, sprite, def, pos, ground, sheet, now) {
        const T = this.TILE
        if (def.tiles) {
            const x0 = Math.round(pos.col * T)
            const y0 = Math.round(pos.row * T)
            def.tiles.forEach((line, r) =>
                line.forEach((id, c) => this._sheetTile(ctx, sheet, id, x0 + c * T, y0 + r * T))
            )
            return
        }
        const img = this._image(def.image)
        if (!img.loaded) {
            return
        }
        const own = this._spriteFrame(sprite, def, now)
        if (own === null) {
            return // pausing without a frame
        }
        const variants = def.variants || 1
        const variant = Math.min(sprite.variant, variants - 1)
        const frame = variant * (def.variantFrames || 0) + own
        let x, y
        if (def.anchor) {
            x = ground.x - def.anchor[0]
            y = ground.y - def.anchor[1]
        } else {
            const fp = def.footprint || [1, 1]
            x = Math.round(pos.col * T) + Math.round((fp[0] * T - def.frameWidth) / 2)
            y = Math.round(pos.row * T) + fp[1] * T - def.frameHeight
        }
        this._drawFrame(ctx, def, img.img, frame, x, y)
    },

    // tinted cells, flashing cell outlines and the light of sun rays on the ground
    _drawCellEffects(ctx, map, world, now) {
        const iso = this._isIso(map)
        const th = iso ? this.data.isometric.tileHeight : this.TILE
        map.tints.forEach((tint, key) => {
            const c = key % map.columns
            const r = Math.floor(key / map.columns)
            ctx.globalAlpha =
                tint.duration > 0 ? Math.min(1, (now - tint.start) / tint.duration) : 1
            this._cellPath(ctx, map, world, c, r, th * 0.18)
            ctx.fillStyle = tint.color
            ctx.fill()
        })
        ctx.globalAlpha = 1
        map.effects.forEach((e) => {
            const a = 1 - (now - e.start) / e.duration
            ctx.globalAlpha = Math.max(0, a)
            if (e.type === 'flash') {
                this._cellPath(ctx, map, world, e.col, e.row, iso ? 1.5 : 1)
                ctx.strokeStyle = e.color
                ctx.lineWidth = iso ? 2.5 : 1.5
                ctx.stroke()
            } else if (e.type === 'sun') {
                this._cellPath(ctx, map, world, e.col, e.row)
                ctx.fillStyle = 'rgba(255,235,140,0.45)'
                ctx.fill()
            }
        })
        ctx.globalAlpha = 1
    },

    // sun rays: a light beam from a sun at the top of the view down to the cell
    _drawSuns(ctx, map, world, view, now) {
        const iso = this._isIso(map)
        const cellWidth = iso ? this.data.isometric.tileWidth : this.TILE
        // sizes are made for the 90 px isometric tiles
        const u = cellWidth / 90
        const dpr = window.devicePixelRatio || 1
        map.effects.forEach((e) => {
            if (e.type !== 'sun') {
                return
            }
            const a = Math.max(0, 1 - (now - e.start) / e.duration)
            const m = this._ground(map, world, e.col, e.row)
            const rad = Math.max(9 * u, (9 * dpr) / view.scale)
            const top = view.y + (16 * dpr) / view.scale
            ctx.fillStyle = `rgba(255,230,120,${0.35 * a})`
            ctx.beginPath()
            ctx.moveTo(m.x - rad * 0.66, top)
            ctx.lineTo(m.x + rad * 0.66, top)
            ctx.lineTo(m.x + cellWidth / 3, m.y)
            ctx.lineTo(m.x - cellWidth / 3, m.y)
            ctx.closePath()
            ctx.fill()

            ctx.strokeStyle = `rgba(255,176,0,${a})`
            ctx.lineWidth = Math.max(1 / view.scale, rad / 5)
            ctx.beginPath()
            for (let i = 0; i < 8; i++) {
                const w = (i * Math.PI) / 4
                ctx.moveTo(m.x + Math.cos(w) * rad * 1.3, top + Math.sin(w) * rad * 1.3)
                ctx.lineTo(m.x + Math.cos(w) * rad * 1.8, top + Math.sin(w) * rad * 1.8)
            }
            ctx.stroke()
            ctx.fillStyle = `rgba(255,210,63,${a})`
            ctx.beginPath()
            ctx.arc(m.x, top, rad, 0, Math.PI * 2)
            ctx.fill()
        })
    },

    // row numbers along the left and column numbers along the top edge of the map
    _drawCoordinates(ctx, map, view) {
        const world = view.world
        const iso = this._isIso(map)
        const dpr = window.devicePixelRatio || 1
        const s = view.scale
        ctx.save()
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.font = Math.max(9 * dpr, Math.round((iso ? 11 : 5) * s)) + 'px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = iso ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.85)'
        const off = iso ? -0.8 : -0.35
        const label = (text, c, r) => {
            const p = this._ground(map, world, c, r)
            ctx.fillText(text, (p.x - view.x) * s, (p.y - view.y) * s)
        }
        for (let r = 0; r < map.rows; r++) {
            label('' + r, off, r)
        }
        for (let c = 0; c < map.columns; c++) {
            label('' + c, c, off)
        }
        ctx.restore()
    },

    _drawGrid(ctx, map, view) {
        const world = view.world
        const s = view.scale
        ctx.save()
        ctx.lineWidth = 1 / s
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)'
        for (let r = 0; r < map.rows; r++) {
            for (let c = 0; c < map.columns; c++) {
                this._cellPath(ctx, map, world, c, r)
                ctx.stroke()
            }
        }
        // labels in screen pixels, independent of the zoom
        const cellWidth = this._isIso(map) ? this.data.isometric.tileWidth / 2 : this.TILE
        if (s * cellWidth >= 24) {
            ctx.setTransform(1, 0, 0, 1, 0, 0)
            const dpr = window.devicePixelRatio || 1
            ctx.font = 9 * dpr + 'px sans-serif'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.lineWidth = 2 * dpr
            ctx.lineJoin = 'round'
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)'
            ctx.fillStyle = 'white'
            for (let r = 0; r < map.rows; r++) {
                for (let c = 0; c < map.columns; c++) {
                    const p = this._ground(map, world, c, r)
                    const x = (p.x - view.x) * s
                    const y = (p.y - view.y) * s
                    ctx.strokeText(c + ',' + r, x, y)
                    ctx.fillText(c + ',' + r, x, y)
                }
            }
        }
        ctx.restore()
    },

    // the map keeps animating after the program ended, until the next run starts
    _startLoop() {
        if (this.frameId) {
            return
        }
        const loop = (t) => {
            this.frameId = null
            const more = this._render(t)
            if (more && this.canvas && document.body.contains(this.canvas[0])) {
                this.frameId = requestAnimationFrame(loop)
            }
        }
        this.frameId = requestAnimationFrame(loop)
    },

    _stopLoop() {
        if (this.frameId) {
            cancelAnimationFrame(this.frameId)
            this.frameId = null
        }
    },

    _resize() {
        if (!this.canvas || !this.canvasElement) {
            return
        }
        const dpr = window.devicePixelRatio || 1
        const rect = this.canvasElement[0].getBoundingClientRect()
        this.canvas[0].width = Math.max(1, Math.round(rect.width * dpr))
        this.canvas[0].height = Math.max(1, Math.round(rect.height * dpr))
        this._render(performance.now())
    },

    // ------------------------------------------------------------------ input

    _cellAt(clientX, clientY) {
        const map = this.currentMap
        if (!map || !this.canvas || !this.data) {
            return null
        }
        const rect = this.canvas[0].getBoundingClientRect()
        const dpr = this.canvas[0].width / Math.max(1, rect.width)
        const view = this._layout(map)
        const x = ((clientX - rect.left) * dpr) / view.scale + view.x
        const y = ((clientY - rect.top) * dpr) / view.scale + view.y
        let col, row
        if (this._isIso(map)) {
            const { tileWidth: tw, tileHeight: th } = this.data.isometric
            const u = (x - view.world.ox) / (tw / 2)
            const v = (y - view.world.oy - th / 2) / (th / 2)
            col = Math.floor((u + v) / 2 + 0.5)
            row = Math.floor((v - u) / 2 + 0.5)
        } else {
            col = Math.floor(x / this.TILE)
            row = Math.floor(y / this.TILE)
        }
        if (col < 0 || row < 0 || col >= map.columns || row >= map.rows) {
            return null
        }
        return { col, row }
    },

    _onClick(e) {
        const map = this.currentMap
        if (!map || !map.clicks) {
            return
        }
        const cell = this._cellAt(e.clientX, e.clientY)
        if (cell) {
            this._send(map, 'TILEMAP', 'click', cell)
        }
    },
}
