import SapErrorWithToken from './SapErrorWithToken';
import Token from '../token/Token';

export default class SapRangeError extends SapErrorWithToken {
  constructor(token: Token, private min: number, private max: number) {
    super(token);
  }

  public get message(): string {
    return `RangeError: Expected value in range [${this.min}, ${this.max}] but received "${this.token.text}".`;
  }
}
