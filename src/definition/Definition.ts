import SapType from '../type/SapType';
import Invocation from '../invocation/Invocation';
import Declaration from './Declaration';
import ReturnStatement from '../invocation/ReturnStatement';

export type ArgumentRangeType = [number, number] | 'unit' | 'bbox_x' | 'bbox_y' | 'bbox_z' | undefined;

export default class Definition {
  public isFromPrefix = false;

  constructor(
    public declaration: Declaration,
    public invocations: Invocation[],
    public argumentTypes: SapType<unknown>[],
    public readonly isBuiltIn: boolean,
    public readonly isRootAssembly: boolean,
    public readonly isChildAssembly: boolean,
    public returnType?: SapType<unknown>,
    public returnStatement?: ReturnStatement,
    public argumentRangeTypes: ArgumentRangeType[][] = [],
  ) {}
}
