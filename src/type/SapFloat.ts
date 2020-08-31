import Token from '../token/Token';
import SapError from '../error/SapError';
import SapType from './SapType';
import SapTypeError from '../error/SapTypeError';
import UnexpectedTokenError from '../error/UnexpectedTokenError';

export default class SapFloat implements SapType<number> {
  parse(tokens: Token[]): number | SapError {
    if (tokens.length > 1) {
      return new UnexpectedTokenError(tokens[1], 'single token');
    }
    const token = tokens[0];
    const asFloat = Number.parseFloat(token.text);
    return Number.isNaN(asFloat) ? new SapTypeError(token, this) : asFloat;
  }

  public get name(): string {
    return 'float';
  }
}
