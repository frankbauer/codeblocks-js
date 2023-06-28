import { ICompilerInfo } from '@/lib/ICompilerRegistry'

//load all versions
import v100 from './python.v100'
import v101 from './python.v101'
import v102 from './python.v102'

export class PythonCompilerInfo implements ICompilerInfo {
    type = 'python'
    displayName = 'Python 2.7'

    //attach all version
    versions = [v100, v101.legacyPython]

    //declare the default one
    default = v101.legacyPython
}

export class Python3CompilerInfo implements ICompilerInfo {
    type = 'python3'
    displayName = 'Python 3'

    //attach all version
    versions = [v101.python3, v102.python3]

    //declare the default one
    default = v101.python3
}

export const PythonCompilers: ICompilerInfo[] | ICompilerInfo = [
    new PythonCompilerInfo(),
    new Python3CompilerInfo(),
]
