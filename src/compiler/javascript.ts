import 'reflect-metadata'
import { Vue, Component, Prop } from 'vue-property-decorator'

import {ICompilerID, ICompilerInfo, IListItemData} from '../lib/ICompilerRegistry'

//load all versions
import v100 from './javascript.v100'
import v101 from './javascript.v101'

export class JavascriptCompilerInfo extends Vue implements ICompilerInfo{
    type = "javascript"
    displayName = "JavaScript"

    //attach all version
    versions = [v100, v101]

    //declare the default one
    default = v101        
};

export const JavascriptCompilers = new JavascriptCompilerInfo();