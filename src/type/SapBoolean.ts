import Token from '../token/Token';
import SapError from '../error/SapError';
import SapType from './SapType';
import SapTypeError from '../error/SapTypeError';

export default class SapBoolean extends SapType<boolean> {
  public validOperators = new Set<string>();

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

  public evaluate(): boolean {
    throw new Error('no operators supported');
  }
}
