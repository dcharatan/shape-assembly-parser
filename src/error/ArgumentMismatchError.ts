import SapErrorWithToken from './SapErrorWithToken';
import Token from '../token/Token';

export default class ArgumentMismatchError extends SapErrorWithToken {
  constructor(token: Token, private expected: number, private received: number) {
    super(token);
  }

  public get message(): string {
    return `ArgumentMismatchError: Expected ${this.expected} arguments but received ${this.received} arguments.`;
  }
}
