import SapInteger from '../SapInteger';
import Token from '../../token/Token';
import SapTypeError from '../../error/SapTypeError';

const makeToken = (text: string) => new Token(text, 0, 1);

describe('SapInteger Unit Tests', () => {
  let sapInteger: SapInteger;

  beforeEach(() => {
    sapInteger = new SapInteger();
  });

  describe('parse', () => {
    test('positive integer parsed correctly', () => {
      expect(sapInteger.parse([makeToken('5')])).toBe(5);
    });

    test('negative integer parsed correctly', () => {
      expect(sapInteger.parse([makeToken('-4')])).toBe(-4);
    });

    test('zero parsed correctly', () => {
      expect(sapInteger.parse([makeToken('0')])).toBe(0);
    });

    test('floating point input gives error', () => {
      const token = makeToken('4.3');
      expect(sapInteger.parse([token])).toEqual(new SapTypeError(token, sapInteger));
    });

    test('non-numerical input gives error', () => {
      const token = makeToken('pumpkin');
      expect(sapInteger.parse([token])).toEqual(new SapTypeError(token, sapInteger));
    });
  });

  describe('name', () => {
    test('name is correct', () => {
      expect(sapInteger.name).toBe('integer');
    });
  });
});
