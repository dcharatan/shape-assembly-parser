import Token from '../token/Token';
import SapError from '../error/SapError';
import SapTypeError from '../error/SapTypeError';
import SapFloat from './SapFloat';
import UnexpectedTokenError from '../error/UnexpectedTokenError';

export default class SapInteger extends SapFloat {
  parse(tokens: Token[]): number | SapError {
    if (tokens.length > 1) {
      return new UnexpectedTokenError(tokens[1], 'single token');
    }
    const token = tokens[0];
    const result = super.parse(tokens);
    if (result instanceof SapError || result === Math.trunc(result)) {
      return result;
    }
    return new SapTypeError(token, this);
  }

  public get name(): string {
    return 'integer';
  }
}
