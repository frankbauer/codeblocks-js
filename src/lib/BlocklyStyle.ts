import { blockStyles, categoryStyles } from "./BlocklyHelper";

import Blockly from '@/plugins/blocklyEnv'
export const blocklyTheme = new Blockly.Theme('CodeBlocks', blockStyles as any, categoryStyles)