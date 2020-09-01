import SapType from '../type/SapType';
import Invocation from '../invocation/Invocation';
import Declaration from './Declaration';

export default class Definition {
  constructor(
    public declaration: Declaration,
    public invocations: Invocation[],
    public argumentTypes: SapType<unknown>[],
    public readonly isBuiltIn: boolean,
    public returnType?: SapType<unknown>,
  ) {}
}
