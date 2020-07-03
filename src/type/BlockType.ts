import Token from '../token/Token';
import SapError from '../error/SapError';
import SapType from './SapType';
import SapTypeError from '../error/SapTypeError';
import Invocation from '../invocation/Invocation';

export default class BlockType implements SapType<Invocation> {
  parse(token: Token, blocksInScope: Invocation[]): Invocation | SapError {
    return blocksInScope.find((block) => block.name === token.text) || new SapTypeError(token, this);
  }

  public get name(): string {
    return 'block';
  }
}
