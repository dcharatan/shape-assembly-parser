import SapType from '../type/SapType';
import Invocation from '../invocation/Invocation';
import Declaration from './Declaration';
import ReturnStatement from '../invocation/ReturnStatement';

export default class Definition {
  constructor(
    public declaration: Declaration,
    public invocations: Invocation[],
    public argumentTypes: SapType<unknown>[],
    public readonly isBuiltIn: boolean,
    public readonly isRootAssembly: boolean,
    public readonly isChildAssembly: boolean,
    public returnType?: SapType<unknown>,
    public returnStatement?: ReturnStatement,
  ) {}
}
