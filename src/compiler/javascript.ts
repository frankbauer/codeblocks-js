import 'reflect-metadata'
import { Vue, Component } from 'vue-property-decorator'
import { ICompilerInfo } from '@/lib/ICompilerRegistry'

//load all versions
import v100 from './javascript.v100'
import v101 from './javascript.v101'

@Component
export class JavascriptCompilerInfo extends Vue implements ICompilerInfo {
    type = 'javascript'
    displayName = 'JavaScript'

    //attach all version
    versions = [v100, v101]

    //declare the default one
    default = v101
}

export const JavascriptCompilers: ICompilerInfo[] | ICompilerInfo = new JavascriptCompilerInfo()
