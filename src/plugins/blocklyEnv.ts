import Vue from 'vue'
import Blockly from '@/lib/blockly/blockly'
import '@/lib/blockly/blocks'
import '@/lib/blockly/javascript'
import '@/lib/blockly/python'
import '@/lib/blockly/java'
import '@/lib/blockly/factory/blocks'
import De from '@/lib/blockly/msg/de'
import i18n from './i18n'

if (i18n.locale.indexOf('de') >= 0) {
    Blockly.setLocale(De)
}
Vue.config.ignoredElements = ['field', 'block', 'category', 'xml', 'mutation', 'value', 'sep']

export default Blockly
