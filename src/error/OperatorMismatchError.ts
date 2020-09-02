import SapErrorWithToken from './SapErrorWithToken';
import Token from '../token/Token';
import SapType from '../type/SapType';

export default class OperatorMismatchError extends SapErrorWithToken {
  constructor(token: Token, private type: SapType<unknown>) {
    super(token);
  }

  public get message(): string {
    return `OperatorMismatchError: Operator ${this.token.text} cannot be used with type ${this.type.name}.`;
  }
}
