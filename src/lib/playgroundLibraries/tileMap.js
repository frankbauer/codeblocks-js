export default {
    // Draws 2D pixel art tile maps (de.fau.tf.lgdv.tilemap in Java). The tiles, sprites and
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
            columns: attrs.columns,
            rows: attrs.rows,
            terrain: this._cells(attrs.terrain, n, 1),
            decorations: this._cells(attrs.decorations, n, 0),
            fog: this._cells(attrs.fog, n, 0),
            autoTiling: attrs.autoTiling !== false,
            zoom: +attrs.zoom || 0,
            followId: -1,
            grid: false,
            clicks: false,
            dirty: true,
            fogDirty: true,
            layer: null,
            fogLayer: null,
        }
        this.maps.set(map.id, map)
        this.currentMap = map
        this._loadData()
            .then(() => this._image(this.data.themes[this._themeOf(map)].image).promise)
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
            glide: null,
            visible: true,
            depth: 0,
            anim: null,
            frame: 0,
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
                if (def.default && sprite.anim === null && sprite.frame === 0) {
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
            x: (attrs.col | 0) * this.TILE,
            y: (attrs.row | 0) * this.TILE,
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
                this._loadData().then(() => this._image(this.data.themes[this._themeOf(map)].image))
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
            case 'listenClicks':
                map.clicks = !!data.enabled
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
                    sprite.frame = this._spriteFrame(sprite, def, now)
                }
                sprite.anim = null
                break
            case 'setFrame':
                sprite.anim = null
                sprite.frame = Math.max(0, data.frame | 0)
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

    // frame of an animation (from..to with per frame durations) `elapsed` ms after its start.
    // `obj` (sprite or character) scales the speed with its tempo; looping animations start
    // at its phase (fraction of one loop).
    _animFrame(def, from, to, elapsed, loop, obj) {
        const durations = def.durations || []
        let total = 0
        for (let f = from; f <= to; f++) {
            total += durations[f] || 100
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
            t -= durations[f] || 100
            if (t < 0) {
                return { frame: f, done: false }
            }
        }
        return { frame: to, done: false }
    },

    _spriteFrame(sprite, def, now) {
        if (!sprite.anim) {
            return Math.min(sprite.frame, (def.frames || 1) - 1)
        }
        const a = sprite.anim
        const { frame, done } = this._animFrame(def, a.from, a.to, now - a.start, a.loop, sprite)
        if (done && !a.ended) {
            a.ended = true
            this._send(sprite, 'MAPSPRITE', 'ended', { animation: a.name })
        }
        return frame
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
        const T = this.TILE
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
                        fromX: ch.x,
                        fromY: ch.y,
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
                        ch.col = item.col | 0
                        ch.row = item.row | 0
                        ch.x = ch.col * T
                        ch.y = ch.row * T
                    }
                    ch.clock = start
                    continue
                }
            }
            const cur = ch.current
            const t = cur.duration > 0 ? (now - cur.start) / cur.duration : 1
            if (cur.type === 'step') {
                const k = Math.min(1, t)
                ch.x = cur.fromX + (cur.col * T - cur.fromX) * k
                ch.y = cur.fromY + (cur.row * T - cur.fromY) * k
                ch.lastWalk = now
            }
            if (t < 1) {
                break
            }
            ch.clock = cur.start + cur.duration
            ch.current = null
            if (cur.type === 'step') {
                ch.col = cur.col
                ch.row = cur.row
                ch.x = ch.col * T
                ch.y = ch.row * T
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

    _characterFrame(ch, def, now) {
        const walking = ch.current?.type === 'step' || now - ch.lastWalk <= this.WALK_GRACE_MS
        let name = def.directions[ch.dir] || def.directions.S
        let start = ch.walkStart
        if (!walking && def.idle) {
            name = def.idle
            start = ch.idleStart
        }
        const anim = def.animations[name]
        return this._animFrame(def, anim.from, anim.to, now - start, true, ch).frame
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

    // ------------------------------------------------------------------ rendering

    _sheetTile(ctx, sheet, id, x, y) {
        if (id < 0) {
            return
        }
        const cols = this.data.sheet.columns
        const T = this.TILE
        ctx.drawImage(sheet, (id % cols) * T, Math.floor(id / cols) * T, T, T, x, y, T, T)
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

    // terrain and decorations, drawn once at 1:1 and redrawn when they change
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

    // scale (device pixels per map pixel) and camera (map pixel shown at the top left)
    _layout(map) {
        const cw = this.canvas[0].width
        const ch = this.canvas[0].height
        const dpr = window.devicePixelRatio || 1
        const mw = map.columns * this.TILE
        const mh = map.rows * this.TILE
        let scale
        if (map.zoom > 0) {
            scale = map.zoom * dpr
        } else {
            // whole multiples keep the pixel art even, below 2x the map rather fills the view
            scale = Math.min(cw / mw, ch / mh)
            if (scale >= 2) {
                scale = Math.floor(scale)
            }
        }
        const vw = cw / scale
        const vh = ch / scale
        const follow = map.followId >= 0 ? this.characters.get(map.followId) : null
        const camera = (size, view, center) => {
            if (size <= view) {
                return (size - view) / 2
            }
            return Math.max(0, Math.min(size - view, center - view / 2))
        }
        const T = this.TILE
        const x = camera(mw, vw, follow ? follow.x + T / 2 : mw / 2)
        const y = camera(mh, vh, follow ? follow.y + T / 2 : mh / 2)
        // whole device pixels, so the tiles stay crisp
        return { scale, x: Math.round(x * scale) / scale, y: Math.round(y * scale) / scale }
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
        this.characters.forEach((ch) => {
            if (ch.mapId === map.id) {
                this._updateCharacter(ch, now)
            }
        })

        ctx.fillStyle = this.data.themes[this._themeOf(map)].background
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        if (!this._updateLayers(map)) {
            return true
        }

        const view = this._layout(map)
        ctx.imageSmoothingEnabled = false
        ctx.setTransform(view.scale, 0, 0, view.scale, -view.x * view.scale, -view.y * view.scale)
        ctx.drawImage(map.layer, 0, 0)

        const T = this.TILE
        const sheet = this._image(this.data.themes[this._themeOf(map)].image).img
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
            drawables.push({
                key: (pos.row + fp[1]) * T,
                depth: sprite.depth,
                order: 0,
                id: sprite.id,
                draw: () => {
                    const x0 = Math.round(pos.col * T)
                    const y0 = Math.round(pos.row * T)
                    if (def.tiles) {
                        def.tiles.forEach((line, r) =>
                            line.forEach((id, c) =>
                                this._sheetTile(ctx, sheet, id, x0 + c * T, y0 + r * T)
                            )
                        )
                        return
                    }
                    const img = this._image(def.image)
                    if (!img.loaded) {
                        return
                    }
                    const frame = this._spriteFrame(sprite, def, now)
                    const fw = def.frameWidth
                    const fh = def.frameHeight
                    const x = x0 + Math.round((fp[0] * T - fw) / 2)
                    const y = y0 + fp[1] * T - fh
                    ctx.drawImage(img.img, frame * fw, 0, fw, fh, x, y, fw, fh)
                },
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
            drawables.push({
                key: ch.y + T,
                depth: 0,
                order: 1,
                id: ch.id,
                draw: () => {
                    const img = this._image(def.image)
                    if (!img.loaded) {
                        return
                    }
                    const frame = this._characterFrame(ch, def, now)
                    const fw = def.frameWidth
                    const fh = def.frameHeight
                    const x = Math.round(ch.x + (T - fw) / 2)
                    const y = Math.round(ch.y + T - fh)
                    ctx.drawImage(img.img, frame * fw, 0, fw, fh, x, y, fw, fh)
                },
            })
        })
        drawables.sort(
            (a, b) => a.key - b.key || a.depth - b.depth || a.order - b.order || a.id - b.id
        )
        drawables.forEach((d) => d.draw())

        if (map.hasFog) {
            ctx.drawImage(map.fogLayer, 0, 0)
        }
        if (map.grid) {
            this._drawGrid(ctx, map, view)
        }
        return true
    },

    _drawGrid(ctx, map, view) {
        const T = this.TILE
        ctx.save()
        ctx.lineWidth = 1 / view.scale
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)'
        ctx.beginPath()
        for (let c = 0; c <= map.columns; c++) {
            ctx.moveTo(c * T, 0)
            ctx.lineTo(c * T, map.rows * T)
        }
        for (let r = 0; r <= map.rows; r++) {
            ctx.moveTo(0, r * T)
            ctx.lineTo(map.columns * T, r * T)
        }
        ctx.stroke()
        // labels in screen pixels, independent of the zoom
        const s = view.scale
        if (s * T >= 24) {
            ctx.setTransform(1, 0, 0, 1, 0, 0)
            const dpr = window.devicePixelRatio || 1
            ctx.font = 9 * dpr + 'px sans-serif'
            ctx.lineWidth = 2 * dpr
            ctx.lineJoin = 'round'
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)'
            ctx.fillStyle = 'white'
            for (let r = 0; r < map.rows; r++) {
                for (let c = 0; c < map.columns; c++) {
                    const x = (c * T - view.x) * s + 2 * dpr
                    const y = (r * T - view.y) * s + 10 * dpr
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
        const col = Math.floor(x / this.TILE)
        const row = Math.floor(y / this.TILE)
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
