import { ICompilerInfo } from '@/lib/ICompilerRegistry'

//load all versions
import v001 from './doppio.v001'
import v100 from './teavm.v100'
import v101 from './teavm.v101'

export class JavaCompilerInfo implements ICompilerInfo {
    type = 'java'
    displayName = 'Java'

    //attach all version
    versions = [v001, v100, v101]

    //declare the default one
    default = v100
}

export const JavaCompilers: ICompilerInfo[] | ICompilerInfo = new JavaCompilerInfo()
