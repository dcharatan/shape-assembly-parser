import Token from '../token/Token';
import SapError from '../error/SapError';
import SapRangeError from '../error/SapRangeError';
import SapInteger from './SapInteger';

export default class PositiveInteger extends SapInteger {
  public get name(): string {
    return 'positive integer';
  }

  public validate(expressionValue: number, expressionTokens: Token[]): number | SapError {
    if (expressionValue > 0) {
      return expressionValue;
    }
    return new SapRangeError(expressionTokens, 1, Infinity);
  }
}
