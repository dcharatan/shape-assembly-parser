import Token from '../token/Token';
import ExpressionNode from '../expression/ExpressionNode';
import SapType from '../type/SapType';
export default class Invocation {
  public argumentTypes: SapType<unknown>[] = [];

  constructor(
    public readonly definitionToken: Token,
    public readonly argumentExpressions: ExpressionNode[],
    public readonly assignmentTokens: Token[],
  ) {}
}
