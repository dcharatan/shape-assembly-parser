import SapErrorWithToken from './SapErrorWithToken';
import Token from '../token/Token';

export default class SapRangeError extends SapErrorWithToken {
  constructor(tokens: Token[], private min: number, private max: number) {
    super(
      new Token(
        tokens.map((token) => token.text).join(' '),
        tokens.reduce((start, token) => Math.min(token.start, start), Infinity),
        tokens.reduce((start, token) => Math.max(token.start, start), 0),
      ),
    );
  }

  public get message(): string {
    return `RangeError: Expected value in range [${this.min}, ${this.max}] but received "${this.token.text}".`;
  }
}
