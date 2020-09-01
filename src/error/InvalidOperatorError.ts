import SapErrorWithToken from './SapErrorWithToken';
import Token from '../token/Token';

export default class InvalidOperatorError extends SapErrorWithToken {
  constructor(token: Token, private expected: 'unary' | 'binary') {
    super(token);
  }

  public get message(): string {
    return `InvalidOperatorError: No ${this.expected} operator ${this.token.text} exists.`;
  }
}
