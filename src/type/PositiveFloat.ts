import Token from '../token/Token';
import SapError from '../error/SapError';
import SapFloat from './SapFloat';
import SapRangeError from '../error/SapRangeError';
import UnexpectedTokenError from '../error/UnexpectedTokenError';

export default class PositiveFloat extends SapFloat {
  parse(tokens: Token[]): number | SapError {
    if (tokens.length > 1) {
      return new UnexpectedTokenError(tokens[1], 'single token');
    }
    const token = tokens[0];
    const result = super.parse(tokens);
    if (result instanceof SapError || result > 0) {
      return result;
    }
    return new SapRangeError(token, 0, Infinity);
  }

  public get name(): string {
    return 'positive float';
  }
}
