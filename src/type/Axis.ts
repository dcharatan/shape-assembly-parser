import Token from '../token/Token';
import SapError from '../error/SapError';
import SapType from './SapType';
import SapTypeError from '../error/SapTypeError';
import UnexpectedTokenError from '../error/UnexpectedTokenError';

type AxisEnum = 'X' | 'Y' | 'Z';
export default class Axis implements SapType<AxisEnum> {
  parse(tokens: Token[]): AxisEnum | SapError {
    if (tokens.length > 1) {
      return new UnexpectedTokenError(tokens[1], 'single token');
    }
    const token = tokens[0];
    if (token.text === 'X' || token.text === 'Y' || token.text === 'Z') {
      return token.text;
    }
    return new SapTypeError(token, this);
  }

  public get name(): string {
    return 'axis';
  }
}
