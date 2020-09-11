import Token from '../token/Token';
import SapError from '../error/SapError';
import SapFloat from './SapFloat';
import SapRangeError from '../error/SapRangeError';

export default class PositiveFloat extends SapFloat {
  public get name(): string {
    return 'positive float';
  }

  public validate(expressionValue: number, expressionTokens: Token[]): number | SapError {
    if (expressionValue > 0) {
      return expressionValue;
    }
    return new SapRangeError(expressionTokens, 0, Infinity);
  }
}
