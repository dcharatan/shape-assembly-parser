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

    test('negative integer parsed correctly', () => {
      const token = makeToken('-4');
      expect(positiveInteger.parse(token)).toEqual(new SapRangeError(token, 1, Infinity));
    });

    test('zero parsed correctly', () => {
      const token = makeToken('0');
      expect(positiveInteger.parse(token)).toEqual(new SapRangeError(token, 1, Infinity));
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
});
