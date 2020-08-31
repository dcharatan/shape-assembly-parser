import SapFloat from '../SapFloat';
import Token from '../../token/Token';
import SapTypeError from '../../error/SapTypeError';

const makeToken = (text: string) => new Token(text, 0, 1);

describe('SapFloat Unit Tests', () => {
  let sapFloat: SapFloat;

  beforeEach(() => {
    sapFloat = new SapFloat();
  });

  describe('parse', () => {
    test('positive integer parsed correctly', () => {
      expect(sapFloat.parse([makeToken('5')])).toBe(5);
    });

    test('negative floating point number parsed correctly', () => {
      expect(sapFloat.parse([makeToken('-4.3')])).toBe(-4.3);
    });

    test('zero parsed correctly', () => {
      expect(sapFloat.parse([makeToken('0')])).toBe(0);
    });

    test('non-numerical input gives error', () => {
      const token = makeToken('cucumber');
      expect(sapFloat.parse([token])).toEqual(new SapTypeError(token, sapFloat));
    });
  });

  describe('name', () => {
    test('name is correct', () => {
      expect(sapFloat.name).toBe('float');
    });
  });
});
