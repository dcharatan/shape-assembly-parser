import PositiveFloat from '../PositiveFloat';
import Token from '../../token/Token';
import SapTypeError from '../../error/SapTypeError';
import SapRangeError from '../../error/SapRangeError';

const makeToken = (text: string) => new Token(text, 0, 1);

describe('PositiveFloat Unit Tests', () => {
  let positiveFloat: PositiveFloat;

  beforeEach(() => {
    positiveFloat = new PositiveFloat();
  });

  describe('parse', () => {
    test('correctly parses 5', () => {
      expect(positiveFloat.parse(makeToken('5'))).toBe(5);
    });

    test('too small number gives range error', () => {
      const token = makeToken('-4.3');
      expect(positiveFloat.parse(token)).toEqual(new SapRangeError(token, 0, Infinity));
    });

    test('zero gives range error', () => {
      const token = makeToken('0');
      expect(positiveFloat.parse(token)).toEqual(new SapRangeError(token, 0, Infinity));
    });

    test('one parsed correctly', () => {
      expect(positiveFloat.parse(makeToken('1'))).toBe(1);
    });

    test('0.3 parsed correctly', () => {
      expect(positiveFloat.parse(makeToken('0.3'))).toBe(0.3);
    });

    test('non-numerical input gives error', () => {
      const token = makeToken('radish');
      expect(positiveFloat.parse(token)).toEqual(new SapTypeError(token, positiveFloat));
    });
  });

  describe('name', () => {
    test('name is correct', () => {
      expect(positiveFloat.name).toBe('positive float');
    });
  });
});
