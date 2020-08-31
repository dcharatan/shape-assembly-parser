import Token from '../token/Token';
import SapError from '../error/SapError';
import SapType from './SapType';
import SapTypeError from '../error/SapTypeError';
import UnexpectedTokenError from '../error/UnexpectedTokenError';

type SideEnum = 'right' | 'left' | 'top' | 'bot' | 'front' | 'back';
export default class Side implements SapType<SideEnum> {
  parse(tokens: Token[]): SideEnum | SapError {
    if (tokens.length > 1) {
      return new UnexpectedTokenError(tokens[1], 'single token');
    }
    const token = tokens[0];
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
}
