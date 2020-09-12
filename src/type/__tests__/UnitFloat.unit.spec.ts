import UnitFloat from '../UnitFloat';
import Token from '../../token/Token';
import SapTypeError from '../../error/SapTypeError';
import SapRangeError from '../../error/SapRangeError';

const makeToken = (text: string) => new Token(text, 0, 1);

describe('UnitFloat Unit Tests', () => {
  let unitFloat: UnitFloat;

  beforeEach(() => {
    unitFloat = new UnitFloat();
  });

  describe('parse', () => {
    test('zero parsed correctly', () => {
      expect(unitFloat.parse(makeToken('0'))).toBe(0);
    });

    test('one parsed correctly', () => {
      expect(unitFloat.parse(makeToken('1'))).toBe(1);
    });

    test('0.3 parsed correctly', () => {
      expect(unitFloat.parse(makeToken('0.3'))).toBe(0.3);
    });

    test('non-numerical input gives error', () => {
      const token = makeToken('onion');
      expect(unitFloat.parse(token)).toEqual(new SapTypeError(token, unitFloat));
    });
  });

  describe('name', () => {
    test('name is correct', () => {
      expect(unitFloat.name).toBe('unit float');
    });
  });

  describe('validate', () => {
    test('too large number gives range error', () => {
      const tokens = [makeToken('5')];
      expect(unitFloat.validate(5, tokens)).toEqual(new SapRangeError(tokens, 0, 1));
    });

    test('too small number gives range error', () => {
      const tokens = [makeToken('-4.3')];
      expect(unitFloat.validate(-4.3, tokens)).toEqual(new SapRangeError(tokens, 0, 1));
    });
  });
});
