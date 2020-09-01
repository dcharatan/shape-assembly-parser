import Token from '../token/Token';
import SapError from '../error/SapError';
import SapType from './SapType';
import SapTypeError from '../error/SapTypeError';

type AxisEnum = 'X' | 'Y' | 'Z';
export default class Axis implements SapType<AxisEnum> {
  parse(token: Token): AxisEnum | SapError {
    if (token.text === 'X' || token.text === 'Y' || token.text === 'Z') {
      return token.text;
    }
    return new SapTypeError(token, this);
  }

  public get name(): string {
    return 'axis';
  }
}
