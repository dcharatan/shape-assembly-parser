import BlockType from '../BlockType';
import Token from '../../token/Token';

const makeToken = (text: string) => new Token(text, 0, 1);

describe('BlockType Unit Tests', () => {
  let blockType: BlockType;

  beforeEach(() => {
    blockType = new BlockType();
  });

  describe('parse', () => {
    test('number gives TypeError', () => {
      const token = makeToken('5');
      expect(() => blockType.parse(token)).toThrow();
    });
  });

  describe('name', () => {
    test('name is correct', () => {
      expect(blockType.name).toBe('block');
    });
  });
});
