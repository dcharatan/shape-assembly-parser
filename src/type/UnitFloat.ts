import Token from '../token/Token';
import SapError from '../error/SapError';
import SapFloat from './SapFloat';
import SapRangeError from '../error/SapRangeError';

export default class UnitFloat extends SapFloat {
  parse(token: Token): number | SapError {
    const result = super.parse(token);
    if (result instanceof SapError || (result >= 0 && result <= 1)) {
      return result;
    }
    return new SapRangeError(token, 0, 1);
  }

  public get name(): string {
    return 'unit float';
  }
}
