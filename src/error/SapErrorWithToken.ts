import Token from '../token/Token';
import SapError from './SapError';

export default abstract class SapErrorWithToken implements SapError {
  constructor(private token: Token) {}

  abstract message: string;

  public get start(): number {
    return this.token.start;
  }

  public get end(): number {
    return this.token.end;
  }
}
