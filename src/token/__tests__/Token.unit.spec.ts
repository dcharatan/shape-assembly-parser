import Token from '../Token';

describe('Token Unit Tests', () => {
  describe('isNewline', () => {
    test('newline is newline', () => {
      expect(new Token('\n', 0, 1).isNewline).toBeTruthy();
    });

    test('x is not newline', () => {
      expect(new Token('x', 0, 1).isNewline).toBeFalsy();
    });
  });

  describe('isWhitespace', () => {
    test('newline is not whitespace', () => {
      expect(new Token('\n', 0, 1).isWhitespace).toBeFalsy();
    });

    test('tab is whitespace', () => {
      expect(new Token('\t', 0, 1).isWhitespace).toBeTruthy();
    });

    test('space is whitespace', () => {
      expect(new Token(' ', 0, 1).isWhitespace).toBeTruthy();
    });
  });
});
