import { ICompilerInfo } from '@/lib/ICompilerRegistry'

//load all versions
import v100 from './javascript.v100'
import v101 from './javascript.v101'
import v102 from './javascript.v102'

export class JavascriptCompilerInfo implements ICompilerInfo {
    type = 'javascript'
    displayName = 'JavaScript'

    //attach all version
    versions = [v100, v101, v102]

    //declare the default one
    default = v101
}

export const JavascriptCompilers: ICompilerInfo[] | ICompilerInfo = new JavascriptCompilerInfo()
