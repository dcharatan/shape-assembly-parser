import Token from '../token/Token';
import SapError from '../error/SapError';
import SapRangeError from '../error/SapRangeError';
import SapInteger from './SapInteger';
import UnexpectedTokenError from '../error/UnexpectedTokenError';

export default class PositiveInteger extends SapInteger {
  parse(tokens: Token[]): number | SapError {
    if (tokens.length > 1) {
      return new UnexpectedTokenError(tokens[1], 'single token');
    }
    const token = tokens[0];
    const result = super.parse(tokens);
    if (result instanceof SapError || result > 0) {
      return result;
    }
    return new SapRangeError(token, 1, Infinity);
  }

  public get name(): string {
    return 'positive integer';
  }
}
