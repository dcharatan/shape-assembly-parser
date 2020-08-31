import Token from '../token/Token';
import SapError from '../error/SapError';
import SapType from './SapType';
import SapTypeError from '../error/SapTypeError';
import Invocation from '../invocation/Invocation';
import UnexpectedTokenError from '../error/UnexpectedTokenError';

export default class BlockType implements SapType<Invocation> {
  parse(tokens: Token[], blocksInScope: Invocation[]): Invocation | SapError {
    if (tokens.length > 1) {
      return new UnexpectedTokenError(tokens[1], 'single token');
    }
    const token = tokens[0];
    return blocksInScope.find((block) => block.assignmentToken?.text === token.text) || new SapTypeError(token, this);
  }

  public get name(): string {
    return 'block';
  }
}
