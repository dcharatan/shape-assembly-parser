import BlockType from '../BlockType';
import Token from '../../token/Token';
import SapTypeError from '../../error/SapTypeError';
import Invocation from '../../invocation/Invocation';

const makeToken = (text: string) => new Token(text, 0, 1);
const makeInvocation = (token?: Token) => new Invocation(makeToken('unused'), [], token);

describe('BlockType Unit Tests', () => {
  let blockType: BlockType;

  beforeEach(() => {
    blockType = new BlockType();
  });

  describe('parse', () => {
    test('number gives TypeError', () => {
      const token = makeToken('5');
      expect(blockType.parse([token], [])).toEqual(new SapTypeError(token, blockType));
    });

    test('word gives TypeError', () => {
      const token = makeToken('corn');
      expect(blockType.parse([token], [])).toEqual(new SapTypeError(token, blockType));
    });

    test('bad capitalization gives error (x)', () => {
      const token = makeToken('x');
      expect(blockType.parse([token], [])).toEqual(new SapTypeError(token, blockType));
    });

    test('existing block parsed correctly', () => {
      const blockToken = makeToken('block_name');
      const block = makeInvocation(blockToken);
      const blocks = [makeInvocation(undefined), block, makeInvocation(makeToken('other_block'))];
      expect(blockType.parse([blockToken], blocks)).toEqual(block);
    });

    test('missing block gives TypeError', () => {
      const blocks = [
        makeInvocation(makeToken('some_block')),
        makeInvocation(makeToken('other_block')),
        makeInvocation(undefined),
      ];
      const token = makeToken('nonexistent block');
      expect(blockType.parse([token], blocks)).toEqual(new SapTypeError(token, blockType));
    });
  });

  describe('name', () => {
    test('name is correct', () => {
      expect(blockType.name).toBe('block');
    });
  });
});
