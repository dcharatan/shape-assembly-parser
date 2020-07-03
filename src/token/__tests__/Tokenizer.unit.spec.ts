import Tokenizer from '../Tokenizer';
import Token from '../Token';

describe('Tokenizer Unit Tests', () => {
  let tokenizer: Tokenizer;

  beforeEach(() => {
    tokenizer = new Tokenizer();
  });

  describe('isNonSeparatorWhitespace', () => {
    test('space is whitespace', () => {
      expect(tokenizer.isNonSeparatorWhitespace(' ')).toBeTruthy();
    });

    test('tab is whitespace', () => {
      expect(tokenizer.isNonSeparatorWhitespace('\t')).toBeTruthy();
    });

    test('newline is not whitespace', () => {
      expect(tokenizer.isNonSeparatorWhitespace('\n')).toBeFalsy();
    });

    test('x is not whitespace', () => {
      expect(tokenizer.isNonSeparatorWhitespace('x')).toBeFalsy();
    });
  });

  describe('tokenize', () => {
    test('words with whitespace', () => {
      const text = 'zebras are cool';
      expect(tokenizer.tokenize(text).map((t) => t.text)).toEqual(['zebras', ' ', 'are', ' ', 'cool']);
    });

    test('words with whitespace and separators', () => {
      const text = 'zebras (are) \t\n, cool  ';
      expect(tokenizer.tokenize(text).map((t) => t.text)).toEqual([
        'zebras',
        ' ',
        '(',
        'are',
        ')',
        ' \t',
        '\n',
        ',',
        ' ',
        'cool',
        '  ',
      ]);
    });

    test('just separators', () => {
      const text = '(),=';
      expect(tokenizer.tokenize(text).map((t) => t.text)).toEqual(['(', ')', ',', '=']);
    });

    test('single space', () => {
      const text = ' ';
      expect(tokenizer.tokenize(text).map((t) => t.text)).toEqual([text]);
    });

    test('just whitespace', () => {
      const text = ' \t ';
      expect(tokenizer.tokenize(text).map((t) => t.text)).toEqual([text]);
    });

    test('mixed newlines and whitespace', () => {
      const text = ' \n  \n\t \n';
      expect(tokenizer.tokenize(text).map((t) => t.text)).toEqual([' ', '\n', '  ', '\n', '\t ', '\n']);
    });

    test('words with separators', () => {
      const text = 'hello(yes)';
      expect(tokenizer.tokenize(text).map((t) => t.text)).toEqual(['hello', '(', 'yes', ')']);
    });

    test('indices', () => {
      const text = 'hi (hi)  \t';
      expect(tokenizer.tokenize(text)).toEqual([
        new Token('hi', 0, 2),
        new Token(' ', 2, 3),
        new Token('(', 3, 4),
        new Token('hi', 4, 6),
        new Token(')', 6, 7),
        new Token('  \t', 7, 10),
      ]);
    });
  });
});
