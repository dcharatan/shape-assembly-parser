import Token from '../token/Token';
import SapError from '../error/SapError';

export default interface SapType<T> {
  parse(token: Token): T | SapError;
  name: string;
  readonly validOperators: Set<string>;
}
