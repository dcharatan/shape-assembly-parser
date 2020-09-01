import Token from '../token/Token';
import SapError from '../error/SapError';
import SapType from './SapType';
import SapTypeError from '../error/SapTypeError';

export default class SapFloat implements SapType<number> {
  parse(token: Token): number | SapError {
    const asFloat = Number(token.text);
    return Number.isNaN(asFloat) ? new SapTypeError(token, this) : asFloat;
  }

  public get name(): string {
    return 'float';
  }
}
