import Side from '../Side';
import Token from '../../token/Token';
import SapTypeError from '../../error/SapTypeError';

const makeToken = (text: string) => new Token(text, 0, 1);

describe('Side Unit Tests', () => {
  let side: Side;

  beforeEach(() => {
    side = new Side();
  });

  describe('parse', () => {
    test('number gives TypeError', () => {
      const token = makeToken('93.2');
      expect(side.parse([token])).toEqual(new SapTypeError(token, side));
    });

    test('word gives TypeError', () => {
      const token = makeToken('rhubarb');
      expect(side.parse([token])).toEqual(new SapTypeError(token, side));
    });

    test('bad capitalization gives error (TOP)', () => {
      const token = makeToken('TOP');
      expect(side.parse([token])).toEqual(new SapTypeError(token, side));
    });

    test('top parsed correctly', () => {
      expect(side.parse([makeToken('top')])).toBe('top');
    });

    test('bot parsed correctly', () => {
      expect(side.parse([makeToken('bot')])).toBe('bot');
    });

    test('left parsed correctly', () => {
      expect(side.parse([makeToken('left')])).toBe('left');
    });

    test('right parsed correctly', () => {
      expect(side.parse([makeToken('right')])).toBe('right');
    });

    test('front parsed correctly', () => {
      expect(side.parse([makeToken('front')])).toBe('front');
    });

    test('back parsed correctly', () => {
      expect(side.parse([makeToken('back')])).toBe('back');
    });
  });

  describe('name', () => {
    test('name is correct', () => {
      expect(side.name).toBe('side');
    });
  });
});
