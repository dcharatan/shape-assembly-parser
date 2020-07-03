import SapErrorWithToken from './SapErrorWithToken';
import Token from '../token/Token';
import SapType from '../type/SapType';

export default class SapTypeError extends SapErrorWithToken {
  constructor(token: Token, private expectedType: SapType<unknown>) {
    super(token);
  }

  public get message(): string {
    return `TypeError: Expected type ${this.expectedType.name} but received token "${this.token.text}".`;
  }
}
