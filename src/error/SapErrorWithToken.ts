import Token from '../token/Token';
import SapError from './SapError';

export default abstract class SapErrorWithToken extends SapError {
  constructor(protected token: Token) {
    super();
  }

  public get start(): number {
    return this.token.start;
  }

  public get end(): number {
    return this.token.end;
  }
}
