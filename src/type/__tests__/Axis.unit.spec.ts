import Axis from '../Axis';
import Token from '../../token/Token';
import SapTypeError from '../../error/SapTypeError';

const makeToken = (text: string) => new Token(text, 0, 1);

describe('Axis Unit Tests', () => {
  let axis: Axis;

  beforeEach(() => {
    axis = new Axis();
  });

  describe('parse', () => {
    test('number gives TypeError', () => {
      const token = makeToken('5');
      expect(axis.parse(token)).toEqual(new SapTypeError(token, axis));
    });

    test('word gives TypeError', () => {
      const token = makeToken('cabbage');
      expect(axis.parse(token)).toEqual(new SapTypeError(token, axis));
    });

    test('bad capitalization gives error (x)', () => {
      const token = makeToken('x');
      expect(axis.parse(token)).toEqual(new SapTypeError(token, axis));
    });

    test('X parsed correctly', () => {
      expect(axis.parse(makeToken('X'))).toBe('X');
    });

    test('Y parsed correctly', () => {
      expect(axis.parse(makeToken('Y'))).toBe('Y');
    });

    test('Z parsed correctly', () => {
      expect(axis.parse(makeToken('Z'))).toBe('Z');
    });
  });

  describe('name', () => {
    test('name is correct', () => {
      expect(axis.name).toBe('axis');
    });
  });
});
