import Token from '../token/Token';
import SapError from '../error/SapError';
import SapRangeError from '../error/SapRangeError';
import SapInteger from './SapInteger';

export default class PositiveInteger extends SapInteger {
  parse(token: Token): number | SapError {
    const result = super.parse(token);
    if (result instanceof SapError || result > 0) {
      return result;
    }
    return new SapRangeError(token, 1, Infinity);
  }

  public get name(): string {
    return 'positive integer';
  }
}
