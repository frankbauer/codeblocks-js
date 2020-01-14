import Vue from 'vue'
import Blockly from '../lib/blockly'
import '../lib/blockly/javascript'
import '../lib/blockly/python'
import De from '../lib/blockly/msg/de'
import i18n from '../plugins/i18n'

if (i18n.locale.indexOf('de')>=0){
    Blockly.setLocale(De)    
}
Vue.config.ignoredElements = ['field','block','category','xml','mutation','value','sep']

export default Blockly;