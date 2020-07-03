import BlockType from '../BlockType';
import Token from '../../token/Token';
import SapTypeError from '../../error/SapTypeError';
import Invocation from '../../invocation/Invocation';

const makeToken = (text: string) => new Token(text, 0, 1);

describe('BlockType Unit Tests', () => {
  let blockType: BlockType;

  beforeEach(() => {
    blockType = new BlockType();
  });

  describe('parse', () => {
    test('number gives TypeError', () => {
      const token = makeToken('5');
      expect(blockType.parse(token, [])).toEqual(new SapTypeError(token, blockType));
    });

    test('word gives TypeError', () => {
      const token = makeToken('corn');
      expect(blockType.parse(token, [])).toEqual(new SapTypeError(token, blockType));
    });

    test('bad capitalization gives error (x)', () => {
      const token = makeToken('x');
      expect(blockType.parse(token, [])).toEqual(new SapTypeError(token, blockType));
    });

    test('existing block parsed correctly', () => {
      const blockName = 'correct block';
      const block = new Invocation(blockName);
      const blocks = [new Invocation('other block'), block, new Invocation()];
      expect(blockType.parse(makeToken(blockName), blocks)).toEqual(block);
    });

    test('missing block gives TypeError', () => {
      const blocks = [new Invocation('some block'), new Invocation('another block'), new Invocation()];
      const token = makeToken('nonexistent block');
      expect(blockType.parse(token, blocks)).toEqual(new SapTypeError(token, blockType));
    });
  });

  describe('name', () => {
    test('name is correct', () => {
      expect(blockType.name).toBe('block');
    });
  });
});
