import Token from '../token/Token';
import SapError from '../error/SapError';
import SapTypeError from '../error/SapTypeError';
import SapFloat from './SapFloat';

export default class SapInteger extends SapFloat {
  parse(token: Token): number | SapError {
    const result = super.parse(token);
    if (result instanceof SapError || result === Math.trunc(result)) {
      return result;
    }
    return new SapTypeError(token, this);
  }

  public get name(): string {
    return 'integer';
  }
}
