import SapErrorWithToken from './SapErrorWithToken';
import Token from '../token/Token';

export default class UnexpectedTokenError extends SapErrorWithToken {
  constructor(token: Token, private expected: string) {
    super(token);
  }

  public get message(): string {
    return `UnexpectedTokenError: Expected ${this.expected} but received token "${this.token.text}".`;
  }
}
