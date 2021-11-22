const path = require('path'),
    fs = require('fs'),
    sizeOf = require('image-size'),
    { createCanvas, loadImage } = require('canvas')

const animNamesByDir = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW']
const sheetIndex = [0, 1, 3, 5, 4, 6, 7, 2]

function write(dir, files, sprite_width, sprite_height, max_col, max_row) {
    const canvas = createCanvas(sprite_width * max_col, sprite_height * max_row)
    const ctx = canvas.getContext('2d')

    let counter = files.length
    files.forEach((data) => {
        loadImage(data.file).then((image) => {
            ctx.drawImage(image, data.col * sprite_width, data.row * sprite_height)
            counter--
            if (counter === 0) {
                const buffer = canvas.toBuffer('image/png')
                fs.writeFileSync(path.join(dir, '..', `${path.basename(dir)}.png`), buffer)
            }
        })
    })
}

function writeMax(dir, outName, files, sprite_width, sprite_height, max_col, max_row, max_width) {
    const max_in_col = Math.min(max_col, Math.floor(max_width / sprite_width))
    max_row = Math.ceil((max_col * max_row) / max_in_col)
    const canvas = createCanvas(sprite_width * max_in_col, sprite_height * max_row)
    const ctx = canvas.getContext('2d')

    let counter = files.length
    files.forEach((data) => {
        loadImage(data.file).then((image) => {
            const idx = data.col + data.row * max_col
            const col = idx % max_in_col
            const row = Math.floor(idx / max_in_col)
            ctx.drawImage(image, col * sprite_width, row * sprite_height)
            counter--
            if (counter === 0) {
                const buffer = canvas.toBuffer('image/png')
                fs.writeFileSync(path.join(dir, '..', outName), buffer)
            }
        })
    })
}

function buildFigures(dir, indent = '') {
    console.log(`${indent}|-- ${dir}`)

    let sprite_width = 0
    let sprite_height = 0
    const sortedDir = []
    animNamesByDir.forEach((val, idx) => (sortedDir[sheetIndex[idx]] = val))

    let max_col = 0
    const files = sortedDir
        .map((sub, row) =>
            fs.readdirSync(path.join(dir, sub)).map((file, col) => {
                const fileName = path.join(dir, sub, file)
                const dimensions = sizeOf(fileName)
                max_col = Math.max(max_col, col + 1)
                sprite_width = Math.max(sprite_width, dimensions.width)
                sprite_height = Math.max(sprite_height, dimensions.height)

                return {
                    folder: path.join(dir, sub),
                    name: file,
                    file: fileName,
                    row: row,
                    col: col,
                }
            })
        )
        .flat()

    write(dir, files, sprite_width, sprite_height, max_col, animNamesByDir.length)
}

function buildTiles(dir, indent = '') {
    console.log(`${indent}|-- ${dir}`)
    let tile_width = 0
    let tile_height = 0
    let max_col = 0
    let max_row = 0
    const files = fs
        .readdirSync(dir)
        .filter((dir) => dir[0] != '.')
        .map((file, col) => {
            const fileName = path.join(dir, file)
            const dimensions = sizeOf(fileName)
            tile_width = Math.max(tile_width, dimensions.width)
            tile_height = Math.max(tile_height, dimensions.height)

            const parts = path.parse(file).name.split('_')
            let row = 0
            if (parts.length > 2) {
                row = +parts[2]
                col = +parts[1] - 1
            } else if (parts.length > 1) {
                col = 0
                row = +parts[1] - 1
            }

            max_col = Math.max(max_col, col + 1)
            max_row = Math.max(max_row, row + 1)
            return {
                folder: dir,
                name: file,
                file: fileName,
                row: 0,
                col: col,
                outName: `${path.basename(dir)}_${('00' + row).slice(-2)}.png`,
            }
        })
    const variants = files.map((data) => data.outName).filter((v, i, a) => a.indexOf(v) === i)
    variants.forEach((variant) => {
        writeMax(
            dir,
            variant,
            files.filter((data) => data.outName === variant),
            tile_width,
            tile_height,
            max_col,
            1,
            2048
        )
    })
}

const baseSpritePath =
    '/Users/frank/Documents/docker/ilias/data/assCodeQuestion/__dev/codeblocks.js/public/resources/sprite/'

const baseTilePath =
    '/Users/frank/Documents/docker/ilias/data/assCodeQuestion/__dev/codeblocks.js/public/resources/tile/'

fs.readdirSync(baseSpritePath)
    .filter((dir) => dir[0] != '.')
    .filter((dir) => fs.statSync(path.join(baseSpritePath, dir)).isDirectory())
    .forEach((dir) => {
        buildFigures(path.join(baseSpritePath, dir))
    })

fs.readdirSync(baseTilePath)
    .filter((dir) => dir[0] != '.')
    .filter((dir) => fs.statSync(path.join(baseTilePath, dir)).isDirectory())
    .forEach((dir) => {
        buildTiles(path.join(baseTilePath, dir))
    })
