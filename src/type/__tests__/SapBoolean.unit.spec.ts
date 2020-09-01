import SapBoolean from '../SapBoolean';
import Token from '../../token/Token';
import SapTypeError from '../../error/SapTypeError';

const makeToken = (text: string) => new Token(text, 0, 1);

describe('SapBoolean Unit Tests', () => {
  let sapBoolean: SapBoolean;

  beforeEach(() => {
    sapBoolean = new SapBoolean();
  });

  describe('parse', () => {
    test('number gives TypeError', () => {
      const token = makeToken('5');
      expect(sapBoolean.parse(token)).toEqual(new SapTypeError(token, sapBoolean));
    });

    test('word gives TypeError', () => {
      const token = makeToken('hello');
      expect(sapBoolean.parse(token)).toEqual(new SapTypeError(token, sapBoolean));
    });

    test('bad capitalization gives error (true)', () => {
      const token = makeToken('true');
      expect(sapBoolean.parse(token)).toEqual(new SapTypeError(token, sapBoolean));
    });

    test('bad capitalization gives error (false)', () => {
      const token = makeToken('false');
      expect(sapBoolean.parse(token)).toEqual(new SapTypeError(token, sapBoolean));
    });

    test('true parsed correctly', () => {
      expect(sapBoolean.parse(makeToken('True'))).toBe(true);
    });

    test('false parsed correctly', () => {
      expect(sapBoolean.parse(makeToken('False'))).toBe(false);
    });
  });

  describe('name', () => {
    test('name is correct', () => {
      expect(sapBoolean.name).toBe('boolean');
    });
  });
});
