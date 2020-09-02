import Token from '../token/Token';
import SapError from '../error/SapError';
import SapType from './SapType';
export default class BlockType implements SapType<unknown> {
  public validOperators = new Set<string>();

  parse(token: Token): unknown | SapError {
    throw new Error(`BlockType is a reference type and should not be parsed (token: ${token.text}).`);
  }

  public get name(): string {
    return 'block';
  }
}
