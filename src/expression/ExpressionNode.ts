import Token from '../token/Token';
import SapType from '../type/SapType';
import SapError from '../error/SapError';
import NameValidator from '../name/NameValidator';
import UnexpectedTokenError from '../error/UnexpectedTokenError';

export default class ExpressionNode {
  private static nameValidator = new NameValidator();
  constructor(public readonly token: Token, public readonly children: ExpressionNode[]) {}

  public evaluate<T>(as: SapType<T>, variableValues: Map<string, T>): T | SapError {
    if (this.children.length > 0) {
      const values = this.children.map((child) => child.evaluate(as, variableValues));
      const error = values.find((value) => value instanceof SapError);
      if (error) {
        return error;
      }
      return as.evaluate(values as T[], this.token);
    }
    if (ExpressionNode.nameValidator.isValidName(this.token.text)) {
      return variableValues.get(this.token.text) ?? new UnexpectedTokenError(this.token, 'defined variable');
    }
    return as.parse(this.token);
  }
}
