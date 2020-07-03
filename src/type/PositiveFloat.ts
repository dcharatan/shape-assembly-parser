import Token from '../token/Token';
import SapError from '../error/SapError';
import SapFloat from './SapFloat';
import SapRangeError from '../error/SapRangeError';

export default class PositiveFloat extends SapFloat {
  parse(token: Token): number | SapError {
    const result = super.parse(token);
    if (result instanceof SapError || result > 0) {
      return result;
    }
    return new SapRangeError(token, 0, Infinity);
  }

  public get name(): string {
    return 'positive float';
  }
}
