import Token from '../token/Token';
import SapError from '../error/SapError';
import SapType from './SapType';
import SapTypeError from '../error/SapTypeError';
import UnexpectedTokenError from '../error/UnexpectedTokenError';

export default class SapBoolean implements SapType<boolean> {
  parse(tokens: Token[]): boolean | SapError {
    if (tokens.length > 1) {
      return new UnexpectedTokenError(tokens[1], 'single token');
    }
    const token = tokens[0];
    if (token.text === 'True') {
      return true;
    }
    if (token.text === 'False') {
      return false;
    }
    return new SapTypeError(token, this);
  }

  public get name(): string {
    return 'boolean';
  }
}
