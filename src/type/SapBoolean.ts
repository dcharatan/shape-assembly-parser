import Token from '../token/Token';
import SapError from '../error/SapError';
import SapType from './SapType';
import SapTypeError from '../error/SapTypeError';

export default class SapBoolean implements SapType<boolean> {
  parse(token: Token): boolean | SapError {
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
