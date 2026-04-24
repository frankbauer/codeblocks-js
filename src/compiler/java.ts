import { ICompilerInfo } from '@/lib/ICompilerRegistry'

//load all versions
import v001 from './doppio.v001'
import v100 from './teavm.v100'
import v101 from './teavm.v101'
import v102 from './teavm.v102'

export class JavaCompilerInfo implements ICompilerInfo {
    type = 'java'
    displayName = 'Java'

    //attach all version
    versions = [v001, v100, v101, v102]

    //declare the default one
    default = v101
}

export const JavaCompilers: ICompilerInfo[] | ICompilerInfo = new JavaCompilerInfo()
