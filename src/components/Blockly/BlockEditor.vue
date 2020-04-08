<template>
    <div class="q-ml-lg q-pb-sm q-pl-lg">
        <xml
            xmlns="https://developers.google.com/blockly/xml"
            id="blockfactory_toolbox"
            class="toolbox"
            ref="toolbox"
        >
            <category name="Input" :colour="toHTMLColor(blockPrimaryColors.Math)">
                <block type="input_value">
                    <value name="TYPE">
                        <shadow type="type_null"></shadow>
                    </value>
                </block>
                <block type="input_statement">
                    <value name="TYPE">
                        <shadow type="type_null"></shadow>
                    </value>
                </block>
                <block type="input_dummy"></block>
            </category>
            <category name="Field" :colour="toHTMLColor(blockPrimaryColors.Text)">
                <block type="field_static"></block>
                <block type="field_label_serializable"></block>
                <block type="field_input"></block>
                <block type="field_number"></block>
                <block type="field_angle"></block>
                <block type="field_dropdown"></block>
                <block type="field_checkbox"></block>
                <block type="field_colour"></block>
                <!--
      Date picker commented out since it increases footprint by 60%.
      Add it only if you need it.  See also goog.require in blockly.js.
      <block type="field_date"></block>
      -->
                <block type="field_variable"></block>
                <block type="field_image"></block>
            </category>
            <category name="Type" :colour="toHTMLColor(blockPrimaryColors.List)">
                <block type="type_group"></block>
                <block type="type_null"></block>
                <block type="type_boolean"></block>
                <block type="type_number"></block>
                <block type="type_string"></block>
                <block type="type_list"></block>
                <block type="type_other"></block>
            </category>
            <category
                name="Colour"
                id="colourCategory"
                :colour="toHTMLColor(blockPrimaryColors.Colour)"
            >
                <block type="colour_constants"></block>
                <block type="colour_hue"
                    ><mutation colour="20"></mutation><field name="HUE">20</field></block
                >
                <block type="colour_hue"
                    ><mutation colour="65"></mutation><field name="HUE">65</field></block
                >
                <block type="colour_hue"
                    ><mutation colour="120"></mutation><field name="HUE">120</field></block
                >
                <block type="colour_hue"
                    ><mutation colour="160"></mutation><field name="HUE">160</field></block
                >
                <block type="colour_hue"
                    ><mutation colour="210"></mutation><field name="HUE">210</field></block
                >
                <block type="colour_hue"
                    ><mutation colour="230"></mutation><field name="HUE">230</field></block
                >
                <block type="colour_hue"
                    ><mutation colour="260"></mutation><field name="HUE">260</field></block
                >
                <block type="colour_hue"
                    ><mutation colour="290"></mutation><field name="HUE">290</field></block
                >
                <block type="colour_hue"
                    ><mutation colour="330"></mutation><field name="HUE">330</field></block
                >
            </category>
        </xml>
        <div class="row">
            <div class="col-8">
                <div class="blocklyMainContainer" ref="blocklyMainContainer"></div>
            </div>
            <div class="row col-4">
                <div class="col-12">
                    <div class="blocklyPreviewContainer" ref="blocklyPreviewContainer"></div>
                </div>
                <pre class="col-12">{{ blockJSON }}</pre>
                <pre class="col-12">{{ blockStub }}</pre>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import 'reflect-metadata'
import { Vue, Component, Prop, Watch } from 'vue-property-decorator'
import Blockly from '@/plugins/blocklyEnv'

import { blocklyHelper, ColorSelectionWithNone, theme } from '@/lib/BlocklyHelper'
import { IBlocklyToolboxCategory, IBlockDefinition, BlockPrimaryColors } from '@/lib/IBlocklyHelper'

import { uuid } from 'vue-uuid'

const STARTER_BLOCK_XML_TEXT =
    '<xml xmlns="https://developers.google.com/blockly/xml">' +
    '<block type="factory_base" deletable="false" movable="false">' +
    '<value name="TOOLTIP">' +
    '<block type="text" deletable="false" movable="false">' +
    '<field name="TEXT"></field></block></value>' +
    '<value name="HELPURL">' +
    '<block type="text" deletable="false" movable="false">' +
    '<field name="TEXT"></field></block></value>' +
    '<value name="COLOUR">' +
    '<block type="colour_constants">' +
    '<mutation colour="' +
    blocklyHelper.toHTMLColor(BlockPrimaryColors.Procedure) +
    '"></mutation>' +
    '<field name="CATEGORY">{!PrimaryColors.Procedure}</field>' +
    '</block></value></block></xml>'

/**
 * Name of block if not named.
 * @type string
 */
const UNNAMED = 'unnamed'

@Component
export default class BlockEditor extends Vue {
    @Prop({ required: false }) blockDefinition!: IBlockDefinition
    @Prop({ required: false, default: '' }) blockJSON!: string
    @Prop({ required: false, default: '' }) blockStub!: string

    previewWorkspace: Blockly.Workspace | undefined = undefined
    mainWorkspace: Blockly.Workspace | undefined = undefined
    updateBlocksFlag: boolean = false
    updateBlocksFlagDelayed: boolean = false

    get blocklyPreviewContainer(): Element {
        return this.$refs.blocklyPreviewContainer as Element
    }
    get blocklyMainContainer(): Element {
        return this.$refs.blocklyMainContainer as Element
    }
    get blocklyToolboxXML(): Element {
        return this.$refs.toolbox as Element
    }

    mounted() {
        this.updateMain()
        this.showStarterBlock()
        this.updatePreview()
    }

    get blockPrimaryColors(): any {
        return BlockPrimaryColors
    }
    toHTMLColor(cl: BlockPrimaryColors): string {
        return blocklyHelper.toHTMLColor(cl)
    }

    /**
     * Get the generator code for a given block.
     * @param {!Blockly.Block} block Rendered block in preview workspace.
     * @param {string} generatorLanguage 'JavaScript', 'Python', 'PHP', 'Lua',
     *     or 'Dart'.
     * @return {string} Generator code for multiple blocks.
     */
    private getGeneratorStub(block, generatorLanguage) {
        function makeVar(root, name) {
            name = name.toLowerCase().replace(/\W/g, '_')
            return '  const ' + root + '_' + name
        }
        // The makevar function lives in the original update generator.
        let language = generatorLanguage
        let code: any[] = []
        //code.push('Blockly.' + language + "['" + block.type + "'] = function(block) {")

        // Generate getters for any fields or inputs.
        for (let i = 0, input; (input = block.inputList[i]); i++) {
            for (let j = 0, field; (field = input.fieldRow[j]); j++) {
                let name = field.name
                if (!name) {
                    continue
                }
                if (field instanceof Blockly.FieldVariable) {
                    // Subclass of Blockly.FieldDropdown, must test first.
                    code.push(
                        makeVar('variable', name) +
                            ' = Blockly.' +
                            language +
                            ".variableDB_.getName(block.getFieldValue('" +
                            name +
                            "'), Blockly.Variables.NAME_TYPE);"
                    )
                } else if (field instanceof Blockly.FieldAngle) {
                    // Subclass of Blockly.FieldTextInput, must test first.
                    code.push(makeVar('angle', name) + " = block.getFieldValue('" + name + "');")
                } else if (Blockly.FieldDate && field instanceof Blockly.FieldDate) {
                    // Blockly.FieldDate may not be compiled into Blockly.
                    code.push(makeVar('date', name) + " = block.getFieldValue('" + name + "');")
                } else if (field instanceof Blockly.FieldColour) {
                    code.push(makeVar('colour', name) + " = block.getFieldValue('" + name + "');")
                } else if (field instanceof Blockly.FieldCheckbox) {
                    code.push(
                        makeVar('checkbox', name) +
                            " = block.getFieldValue('" +
                            name +
                            "') == 'TRUE';"
                    )
                } else if (field instanceof Blockly.FieldDropdown) {
                    code.push(makeVar('dropdown', name) + " = block.getFieldValue('" + name + "');")
                } else if (field instanceof Blockly.FieldNumber) {
                    code.push(makeVar('number', name) + " = block.getFieldValue('" + name + "');")
                } else if (field instanceof Blockly.FieldTextInput) {
                    code.push(makeVar('text', name) + " = block.getFieldValue('" + name + "');")
                }
            }
            let name = input.name
            if (name) {
                if (input.type == Blockly.INPUT_VALUE) {
                    code.push(
                        makeVar('value', name) +
                            ' = Blockly.' +
                            language +
                            ".valueToCode(block, '" +
                            name +
                            "', Blockly." +
                            language +
                            '.ORDER_ATOMIC);'
                    )
                } else if (input.type == Blockly.NEXT_STATEMENT) {
                    code.push(
                        makeVar('statements', name) +
                            ' = Blockly.' +
                            language +
                            ".statementToCode(block, '" +
                            name +
                            "');"
                    )
                }
            }
        }
        // Most languages end lines with a semicolon.  Python & Lua do not.
        let lineEnd = {
            JavaScript: ';',
            Python: '',
            PHP: ';',
            Lua: '',
            Dart: ';'
        }
        code.push('  // TODO: Assemble ' + language + ' into code variable.')
        if (block.outputConnection) {
            code.push("  let code = '...';")
            code.push('  // TODO: Change ORDER_NONE to the correct strength.')
            code.push('  return [code, Blockly.' + language + '.ORDER_NONE];')
        } else {
            code.push("  let code = '..." + (lineEnd[language] || '') + "\\n';")
            code.push('  return code;')
        }

        return code.join('\n')
    }

    /**
     * Return the uneditable container block that everything else attaches to in
     * given workspace.
     * @param {!Blockly.Workspace} workspace Where the root block lives.
     * @return {Blockly.Block} Root block.
     */
    private getRootBlock(workspace) {
        var blocks = workspace.getTopBlocks(false)
        for (var i = 0, block; (block = blocks[i]); i++) {
            if (block.type == 'factory_base') {
                return block
            }
        }
        return null
    }

    /**
     * Get block definition code for the current block.
     * @param {string} blockType Type of block.
     * @param {!Blockly.Block} rootBlock RootBlock from main workspace in which
     *    user uses Block Factory Blocks to create a custom block.
     * @param {string} format 'JSON' or 'JavaScript'.
     * @param {!Blockly.Workspace} workspace Where the root block lives.
     * @return {string} Block definition.
     */
    private getBlockDefinition(blockType, rootBlock, workspace) {
        blockType = this.cleanBlockType(blockType)
        return this.formatJson_(blockType, rootBlock)
    }

    /**
     * Convert invalid block name to a valid one. Replaces whitespace
     * and prepend names that start with a digit with an '_'.
     * @param {string} blockType Type of block.
     * @return {string} Cleaned up block type.
     */
    private cleanBlockType(blockType) {
        if (!blockType) {
            return ''
        }
        return blockType.replace(/\W/g, '_').replace(/^(\d)/, '_$1')
    }
    /**
     * Returns field strings and any config.
     * @param {!Blockly.Block} block Input block.
     * @return {!Array.<string|!Object>} Array of static text and field configs.
     * @private
     */
    private getFieldsJson_(block) {
        let fields: any[] = []
        while (block) {
            if (!block.disabled && !block.getInheritedDisabled()) {
                switch (block.type) {
                    case 'field_static':
                        // Result: 'hello'
                        fields.push(block.getFieldValue('TEXT'))
                        break
                    case 'field_label_serializable':
                        fields.push({
                            type: block.type,
                            name: block.getFieldValue('FIELDNAME'),
                            text: block.getFieldValue('TEXT')
                        })
                        break
                    case 'field_input':
                        fields.push({
                            type: block.type,
                            name: block.getFieldValue('FIELDNAME'),
                            text: block.getFieldValue('TEXT')
                        })
                        break
                    case 'field_number':
                        var obj: any = {
                            type: block.type,
                            name: block.getFieldValue('FIELDNAME'),
                            value: Number(block.getFieldValue('VALUE'))
                        }
                        var min = Number(block.getFieldValue('MIN'))
                        if (min > -Infinity) {
                            obj.min = min
                        }
                        var max = Number(block.getFieldValue('MAX'))
                        if (max < Infinity) {
                            obj.max = max
                        }
                        var precision = Number(block.getFieldValue('PRECISION'))
                        if (precision) {
                            obj.precision = precision
                        }
                        fields.push(obj)
                        break
                    case 'field_angle':
                        fields.push({
                            type: block.type,
                            name: block.getFieldValue('FIELDNAME'),
                            angle: Number(block.getFieldValue('ANGLE'))
                        })
                        break
                    case 'field_checkbox':
                        fields.push({
                            type: block.type,
                            name: block.getFieldValue('FIELDNAME'),
                            checked: block.getFieldValue('CHECKED') == 'TRUE'
                        })
                        break
                    case 'field_colour':
                        fields.push({
                            type: block.type,
                            name: block.getFieldValue('FIELDNAME'),
                            colour: block.getFieldValue('COLOUR')
                        })
                        break
                    case 'field_date':
                        fields.push({
                            type: block.type,
                            name: block.getFieldValue('FIELDNAME'),
                            date: block.getFieldValue('DATE')
                        })
                        break
                    case 'field_variable':
                        fields.push({
                            type: block.type,
                            name: block.getFieldValue('FIELDNAME'),
                            variable: block.getFieldValue('TEXT') || null
                        })
                        break
                    case 'field_dropdown':
                        var options = []
                        for (var i = 0; i < block.optionList_.length; i++) {
                            options[i] = [
                                block.getUserData(i) as any,
                                block.getFieldValue('CPU' + i)
                            ]
                        }
                        if (options.length) {
                            fields.push({
                                type: block.type,
                                name: block.getFieldValue('FIELDNAME'),
                                options: options
                            })
                        }
                        break
                    case 'field_image':
                        fields.push({
                            type: block.type,
                            src: block.getFieldValue('SRC'),
                            width: Number(block.getFieldValue('WIDTH')),
                            height: Number(block.getFieldValue('HEIGHT')),
                            alt: block.getFieldValue('ALT'),
                            flipRtl: block.getFieldValue('FLIP_RTL') == 'TRUE'
                        })
                        break
                }
            }
            block = block.nextConnection && block.nextConnection.targetBlock()
        }
        return fields
    }

    /**
     * Fetch the type(s) defined in the given input.
     * Format as a string for appending to the generated code.
     * @param {!Blockly.Block} block Block with input.
     * @param {string} name Name of the input.
     * @return {?string} String defining the types.
     */
    private getOptTypesFrom(block, name) {
        var types = this.getTypesFrom_(block, name)
        if (types.length == 0) {
            return undefined
        } else if (types.indexOf('null') != -1) {
            return 'null'
        } else if (types.length == 1) {
            return types[0]
        } else {
            return '[' + types.join(', ') + ']'
        }
    }

    /**
     * Fetch the type(s) defined in the given input.
     * @param {!Blockly.Block} block Block with input.
     * @param {string} name Name of the input.
     * @return {!Array.<string>} List of types.
     * @private
     */
    private getTypesFrom_(block, name) {
        var typeBlock = block.getInputTargetBlock(name)
        var types
        if (!typeBlock || typeBlock.disabled) {
            types = []
        } else if (typeBlock.type == 'type_other') {
            types = [JSON.stringify(typeBlock.getFieldValue('TYPE'))]
        } else if (typeBlock.type == 'type_group') {
            types = []
            for (var n = 0; n < typeBlock.typeCount_; n++) {
                types = types.concat(this.getTypesFrom_(typeBlock, 'TYPE' + n))
            }
            // Remove duplicates.
            var hash = Object.create(null)
            for (let n = types.length - 1; n >= 0; n--) {
                if (hash[types[n]]) {
                    types.splice(n, 1)
                }
                hash[types[n]] = true
            }
        } else {
            types = [JSON.stringify(typeBlock.valueType)]
        }
        return types
    }

    /**
     * Given the root block of the factory, return the tooltip specified by the user
     * or the empty string if no tooltip is found.
     * @param {!Blockly.Block} rootBlock Factory_base block.
     * @return {string} The tooltip for the generated block, or the empty string.
     */
    private getTooltipFromRootBlock_(rootBlock) {
        const tooltipBlock = rootBlock.getInputTargetBlock('TOOLTIP')
        if (tooltipBlock && !tooltipBlock.disabled) {
            return tooltipBlock.getFieldValue('TEXT')
        }
        return ''
    }

    /**
     * Given the root block of the factory, return the help url specified by the
     * user or the empty string if no tooltip is found.
     * @param {!Blockly.Block} rootBlock Factory_base block.
     * @return {string} The help url for the generated block, or the empty string.
     */
    private getHelpUrlFromRootBlock_(rootBlock) {
        const helpUrlBlock = rootBlock.getInputTargetBlock('HELPURL')
        if (helpUrlBlock && !helpUrlBlock.disabled) {
            return helpUrlBlock.getFieldValue('TEXT')
        }
        return ''
    }

    /**
     * Update the language code as JSON.
     * @param {string} blockType Name of block.
     * @param {!Blockly.Block} rootBlock Factory_base block.
     * @return {string} Generanted language code.
     * @private
     */
    private formatJson_(blockType, rootBlock) {
        var JS: any = {}
        // Type is not used by Blockly, but may be used by a loader.
        JS.type = blockType
        // Generate inputs.
        var message: any[] = []
        var args: any[] = []
        var contentsBlock = rootBlock.getInputTargetBlock('INPUTS')
        var lastInput: any = null
        while (contentsBlock) {
            if (!contentsBlock.disabled && !contentsBlock.getInheritedDisabled()) {
                var fields = this.getFieldsJson_(contentsBlock.getInputTargetBlock('FIELDS'))
                for (var i = 0; i < fields.length; i++) {
                    if (typeof fields[i] == 'string') {
                        message.push(fields[i].replace(/%/g, '%%'))
                    } else {
                        args.push(fields[i])
                        message.push('%' + args.length)
                    }
                }

                let input: any = { type: contentsBlock.type }
                // Dummy inputs don't have names.  Other inputs do.
                if (contentsBlock.type != 'input_dummy') {
                    input.name = contentsBlock.getFieldValue('INPUTNAME')
                }
                var check = JSON.parse(this.getOptTypesFrom(contentsBlock, 'TYPE') || 'null')
                if (check) {
                    input.check = check
                }
                var align = contentsBlock.getFieldValue('ALIGN')
                if (align != 'LEFT') {
                    input.align = align
                }
                args.push(input)
                message.push('%' + args.length)
                lastInput = contentsBlock
            }
            contentsBlock =
                contentsBlock.nextConnection && contentsBlock.nextConnection.targetBlock()
        }
        // Remove last input if dummy and not empty.
        if (lastInput && lastInput.type == 'input_dummy') {
            const innerFields = lastInput.getInputTargetBlock('FIELDS')
            if (
                innerFields &&
                this.getFieldsJson_(innerFields)
                    .join('')
                    .trim() != ''
            ) {
                var innerAlign = lastInput.getFieldValue('ALIGN')
                if (innerAlign != 'LEFT') {
                    JS.lastDummyAlign0 = innerAlign
                }
                args.pop()
                message.pop()
            }
        }
        JS.message0 = message.join(' ')
        if (args.length) {
            JS.args0 = args
        }
        // Generate inline/external switch.
        if (rootBlock.getFieldValue('INLINE') == 'EXT') {
            JS.inputsInline = false
        } else if (rootBlock.getFieldValue('INLINE') == 'INT') {
            JS.inputsInline = true
        }
        // Generate output, or next/previous connections.
        switch (rootBlock.getFieldValue('CONNECTIONS')) {
            case 'LEFT':
                JS.output = JSON.parse(this.getOptTypesFrom(rootBlock, 'OUTPUTTYPE') || 'null')
                break
            case 'BOTH':
                JS.previousStatement = JSON.parse(
                    this.getOptTypesFrom(rootBlock, 'TOPTYPE') || 'null'
                )
                JS.nextStatement = JSON.parse(
                    this.getOptTypesFrom(rootBlock, 'BOTTOMTYPE') || 'null'
                )
                break
            case 'TOP':
                JS.previousStatement = JSON.parse(
                    this.getOptTypesFrom(rootBlock, 'TOPTYPE') || 'null'
                )
                break
            case 'BOTTOM':
                JS.nextStatement = JSON.parse(
                    this.getOptTypesFrom(rootBlock, 'BOTTOMTYPE') || 'null'
                )
                break
        }
        // Generate colour.
        var colourBlock = rootBlock.getInputTargetBlock('COLOUR')
        if (colourBlock && !colourBlock.disabled) {
            const cat = colourBlock.getFieldValue('CATEGORY')
            JS.colour = blocklyHelper.toHTMLColor(cat)
        }

        JS.tooltip = this.getTooltipFromRootBlock_(rootBlock)
        JS.helpUrl = this.getHelpUrlFromRootBlock_(rootBlock)

        return JSON.stringify(JS, null, '  ')
    }

    private updateMain() {
        if (!this.mainWorkspace) {
            console.d('INJECT BLOCKLY FACTORY', this.blocklyMainContainer)
            this.mainWorkspace = Blockly.inject(this.blocklyMainContainer, {
                toolbox: this.blocklyToolboxXML,
                collapse: false,
                comments: false,
                disable: false,
                tehem: theme,
                renderer: 'minimalist',
                scrollbars: true
            })

            // Update code on changes to block being edited.
            this.mainWorkspace.addChangeListener(this.updateLanguage)

            // Disable blocks not attached to the factory_base block.
            this.mainWorkspace.addChangeListener(Blockly.Events.disableOrphans)
        }
    }

    /**
     * Update the language code based on constructs made in Blockly.
     */
    private updateLanguage() {
        const rootBlock = this.getRootBlock(this.mainWorkspace)
        console.d('Update Language', rootBlock)
        if (!rootBlock) {
            return
        }
        let blockType = rootBlock
            .getFieldValue('NAME')
            .trim()
            .toLowerCase()
        if (!blockType) {
            blockType = UNNAMED
        }

        if (!this.updateBlocksFlag) {
            var code = this.getBlockDefinition(blockType, rootBlock, this.mainWorkspace)
            this.blockJSON = code
            if (!this.updateBlocksFlagDelayed) {
                // const languagePre = document.getElementById('languagePre')
                // const languageTA = document.getElementById('languageTA')
                // code = languagePre.innerText.trim()
                // languageTA.value = code
            }
        }

        this.updatePreview()
    }

    private updatePreview() {
        if (!this.previewWorkspace) {
            console.d('INJECT BLOCKLY PREVIEW', this.blocklyPreviewContainer)
            this.previewWorkspace = Blockly.inject(this.blocklyPreviewContainer, {
                scrollbars: true,
                theme: theme,
                renderer: 'minimalist'
            })
        }

        this.previewWorkspace.clear()

        const code = this.blockDefinition
            ? blocklyHelper.serializeCustomBlock(this.blockDefinition)
            : this.blockJSON
        if (!code.trim()) {
            return
        }

        // Backup Blockly.Blocks object so that main workspace and preview don't
        // collide if user creates a 'factory_base' block, for instance.
        const backupBlocks = Blockly.Blocks
        try {
            // Make a shallow copy.
            Blockly.Blocks = Object.create(null)
            for (let prop in backupBlocks) {
                Blockly.Blocks[prop] = backupBlocks[prop]
            }

            const json = JSON.parse(code)
            Blockly.Blocks[json.type || UNNAMED] = {
                init: function() {
                    this.jsonInit(json)
                }
            }

            // Look for a block on Blockly.Blocks that does not match the backup.
            let blockType = null
            for (let type in Blockly.Blocks) {
                if (
                    typeof Blockly.Blocks[type].init == 'function' &&
                    Blockly.Blocks[type] != backupBlocks[type]
                ) {
                    blockType = type
                    break
                }
            }
            if (!blockType) {
                return
            }

            // Create the preview block.
            const previewBlock: any = this.previewWorkspace.newBlock(blockType)
            previewBlock.initSvg()
            previewBlock.render()
            previewBlock.setMovable(false)
            previewBlock.setDeletable(false)
            previewBlock.moveBy(0, 0)
            this.previewWorkspace.clearUndo()
            this.updateGenerator(previewBlock)
        } catch (err) {
            // TODO: Show error on the UI
            console.log(err)
            this.updateBlocksFlag = false
            this.updateBlocksFlagDelayed = false
        } finally {
            Blockly.Blocks = backupBlocks
        }
    }

    /**
     * Update the generator code.
     * @param {!Blockly.Block} block Rendered block in preview workspace.
     */
    private updateGenerator(block) {
        this.blockStub = this.getGeneratorStub(block, 'Javascript')
    }

    private showStarterBlock() {
        if (this.mainWorkspace) {
            this.mainWorkspace.clear()
            const xml = Blockly.Xml.textToDom(STARTER_BLOCK_XML_TEXT)
            Blockly.Xml.domToWorkspace(xml, this.mainWorkspace)
        }
    }
}
</script>

<style lang="sass">
#blockfactory_toolbox
    display: none
.blocklyMainContainer
    height: 500px
.blocklyPreviewContainer
    width: 100%
    height: 200px
</style>
