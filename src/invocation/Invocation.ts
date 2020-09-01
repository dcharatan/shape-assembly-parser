import Token from '../token/Token';
import ExpressionNode from '../expression/ExpressionNode';

export default class Invocation {
  constructor(
    public readonly definitionToken: Token,
    public readonly argumentExpressions: ExpressionNode[],
    public readonly assignmentToken?: Token,
  ) {}
}
