import SapErrorWithToken from './SapErrorWithToken';
import Token from '../token/Token';

export default class IncompleteInvocationError extends SapErrorWithToken {
  constructor(token: Token, private expected: string) {
    super(token);
  }

  public get message(): string {
    return `IncompleteInvocationError: Expected ${this.expected} after token "${this.token.text}".`;
  }
}
