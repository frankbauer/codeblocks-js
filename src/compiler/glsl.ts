import 'reflect-metadata'
import { Vue, Options } from 'vue-class-component'
import { ICompilerInfo } from '@/lib/ICompilerRegistry'

//load all versions
import { v100 } from './glsl.v100'

@Options({})
export class GLSLCompilerInfo extends Vue implements ICompilerInfo {
    readonly type = 'glsl'
    readonly displayName = 'GLSL Shader'

    //attach all version
    readonly versions = [v100]

    //declare the default one
    readonly default = v100
}

export const GLSLCompilers: ICompilerInfo[] | ICompilerInfo = new GLSLCompilerInfo()
