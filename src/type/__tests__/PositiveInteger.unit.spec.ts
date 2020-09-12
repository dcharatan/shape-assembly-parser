import PositiveInteger from '../PositiveInteger';
import Token from '../../token/Token';
import SapTypeError from '../../error/SapTypeError';
import SapRangeError from '../../error/SapRangeError';

const makeToken = (text: string) => new Token(text, 0, 1);

describe('PositiveInteger Unit Tests', () => {
  let positiveInteger: PositiveInteger;

  beforeEach(() => {
    positiveInteger = new PositiveInteger();
  });

  describe('parse', () => {
    test('positive integer parsed correctly', () => {
      expect(positiveInteger.parse(makeToken('5'))).toBe(5);
    });

    test('floating point input gives error', () => {
      const token = makeToken('4.3');
      expect(positiveInteger.parse(token)).toEqual(new SapTypeError(token, positiveInteger));
    });

    test('non-numerical input gives error', () => {
      const token = makeToken('tomato');
      expect(positiveInteger.parse(token)).toEqual(new SapTypeError(token, positiveInteger));
    });
  });

  describe('name', () => {
    test('name is correct', () => {
      expect(positiveInteger.name).toBe('positive integer');
    });
  });

  describe('validate', () => {
    test('negative integer parsed correctly', () => {
      const tokens = [makeToken('-4')];
      expect(positiveInteger.validate(-4, tokens)).toEqual(new SapRangeError(tokens, 1, Infinity));
    });

    test('zero parsed correctly', () => {
      const tokens = [makeToken('0')];
      expect(positiveInteger.validate(0, tokens)).toEqual(new SapRangeError(tokens, 1, Infinity));
    });
  });
});
