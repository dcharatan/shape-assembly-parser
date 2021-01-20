import Token from '../token/Token';
import ExpressionNode from '../expression/ExpressionNode';
import SapType from '../type/SapType';
import { ArgumentRangeType } from '../definition/Definition';

export default class Invocation {
  public argumentTypes: SapType<unknown>[] = [];
  public argumentRangeTypes: ArgumentRangeType[][] = [];

  constructor(
    public readonly definitionToken: Token,
    public readonly argumentExpressions: ExpressionNode[],
    public readonly assignmentTokens: Token[],
  ) {}
}
