// Packs / unpacks the images licensed from Freepik (listed in licensed-assets.json).
// They may be used in CodeBlocks, but must not be committed to this repository:
//
//   npm run build-licensed-assets    public/ -> codeblocks-licensed-assets.zip
//   npm run extract-licensed-assets  codeblocks-licensed-assets.zip -> public/
//
// The zip uses the same layout as a deployed CodeBlocks version, so it can also be
// extracted directly into <assCodeQuestion>/codeblocks/<version>/ of the ILIAS plugin.
import fs from 'fs'
import path from 'path'
import JSZip from 'jszip'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'licensed-assets.json'), 'utf8'))
const root = path.join(__dirname, manifest.root)
const zipFile = path.join(__dirname, manifest.zip)
const entries = [...manifest.licenses, ...manifest.files]

const README = `CodeBlocks licensed assets
==========================

These images are licensed from Freepik (https://www.freepik.com) and may only be
used as part of CodeBlocks, see the LICENSE files in this archive. Do not
redistribute them or publish them in a public repository.

Installation
- CodeBlocks repository: copy this zip to the repository root and run
  npm run extract-licensed-assets
- ILIAS assCodeQuestion plugin: extract into codeblocks/<version>/ of the plugin, e.g.
  unzip -o ${manifest.zip} -d codeblocks/0.3.0
`

async function build() {
    const missing = entries.filter((file) => !fs.existsSync(path.join(root, file)))
    if (missing.length > 0) {
        console.error(`Missing licensed assets in '${root}':\n    ${missing.join('\n    ')}`)
        process.exit(1)
    }

    const zip = new JSZip()
    zip.file('README-licensed-assets.txt', README)
    for (const file of entries) {
        zip.file(file, fs.readFileSync(path.join(root, file)))
    }
    const data = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
    fs.writeFileSync(zipFile, data)
    console.log(`Packed ${manifest.files.length} licensed assets (+ licenses) into '${zipFile}'`)
}

async function extract() {
    if (!fs.existsSync(zipFile)) {
        console.error(`'${zipFile}' not found. Download it from the restricted location and place it in the repository root.`)
        process.exit(1)
    }

    const zip = await JSZip.loadAsync(fs.readFileSync(zipFile))
    let count = 0
    // only extract the files listed in the manifest (keeps paths inside public/)
    for (const file of entries) {
        const entry = zip.file(file)
        if (!entry) {
            console.warn(`    - not in archive: ${file}`)
            continue
        }
        const dest = path.join(root, file)
        fs.mkdirSync(path.dirname(dest), { recursive: true })
        fs.writeFileSync(dest, await entry.async('nodebuffer'))
        count++
    }
    console.log(`Extracted ${count} of ${entries.length} licensed files into '${root}'`)
}

const commands = { build, extract }
const command = commands[process.argv[2]]
if (!command) {
    console.error('usage: node licensed-assets.js build|extract')
    process.exit(1)
}
await command()
