import Token from '../token/Token';
import SapError from '../error/SapError';
import SapType from './SapType';
import SapTypeError from '../error/SapTypeError';

type SideEnum = 'right' | 'left' | 'top' | 'bot' | 'front' | 'back';
export default class Side extends SapType<SideEnum> {
  public validOperators = new Set<string>();

  parse(token: Token): SideEnum | SapError {
    if (
      token.text === 'right' ||
      token.text === 'left' ||
      token.text === 'top' ||
      token.text === 'bot' ||
      token.text === 'front' ||
      token.text === 'back'
    ) {
      return token.text;
    }
    return new SapTypeError(token, this);
  }

  public get name(): string {
    return 'side';
  }

  public evaluate(): SideEnum | SapError {
    throw new Error('no operators supported');
  }
}
