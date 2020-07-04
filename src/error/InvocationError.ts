import SapErrorWithToken from './SapErrorWithToken';
import Token from '../token/Token';

export default class InvocationError extends SapErrorWithToken {
  constructor(token: Token) {
    super(token);
  }

  public get message(): string {
    return `InvocationError: Could not find a corresponding definition for invocation of function "${this.token.text}".`;
  }
}
