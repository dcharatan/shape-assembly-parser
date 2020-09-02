import SapError from '../error/SapError';
import SapType from './SapType';

export default class UnknownType implements SapType<unknown> {
  public validOperators = new Set<string>();

  parse(): unknown | SapError {
    throw new Error("This is a placeholder type. Don't try to parse things using it.");
  }

  public get name(): string {
    return 'unknown';
  }

  public evaluate(): unknown {
    throw new Error('no operators supported');
  }
}
