import Token from '../token/Token';

export default class ExpressionNode {
  constructor(public readonly token: Token, public readonly children: ExpressionNode[]) {}
}
