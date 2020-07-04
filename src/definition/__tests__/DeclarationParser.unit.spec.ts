import DeclarationParser from '../DeclarationParser';
import Statement from '../../statement/Statement';
import Token from '../../token/Token';
import SapError from '../../error/SapError';

const makeToken = (text: string) => new Token(text, 0, 1);
const makeStatement = (tokens: Token[], indentation: number) => new Statement(tokens, indentation);

describe('DeclarationParser Unit Tests', () => {
  let parser: DeclarationParser;

  beforeEach(() => {
    parser = new DeclarationParser();
  });

  describe('parseDeclaration', () => {
    test('correct parsing for definition with no arguments', () => {
      const tokens = ['def', 'zebra', '(', ')', ':'].map(makeToken);
      const statement = makeStatement(tokens, 0);
      expect(parser.parseDeclaration(statement)).toEqual({
        nameToken: tokens[1],
        parameterTokens: [],
      });
    });

    test('correct parsing for definition with one argument', () => {
      const tokens = ['def', 'fir', '(', 'maple', ')', ':'].map(makeToken);
      const statement = makeStatement(tokens, 0);
      expect(parser.parseDeclaration(statement)).toEqual({
        nameToken: tokens[1],
        parameterTokens: [tokens[3]],
      });
    });

    test('correct parsing for definition with one argument', () => {
      const tokens = ['def', 'birch', '(', 'spruce', ',', 'redwood', ')', ':'].map(makeToken);
      const statement = makeStatement(tokens, 0);
      expect(parser.parseDeclaration(statement)).toEqual({
        nameToken: tokens[1],
        parameterTokens: [tokens[3], tokens[5]],
      });
    });

    test('incorrect indentation gives error', () => {
      const tokens = ['def', 'birch', '(', 'spruce', ',', 'redwood', ')', ':'].map(makeToken);
      const statement = makeStatement(tokens, 2);
      expect(parser.parseDeclaration(statement)).toBeInstanceOf(SapError);
    });

    test('no definition name gives error', () => {
      const tokens = ['def', '(', 'spruce', ',', 'redwood', ')', ':'].map(makeToken);
      const statement = makeStatement(tokens, 0);
      expect(parser.parseDeclaration(statement)).toBeInstanceOf(SapError);
    });

    test('no opening parenthesis gives error', () => {
      const tokens = ['def', 'birch', 'spruce', ',', 'redwood', ')', ':'].map(makeToken);
      const statement = makeStatement(tokens, 0);
      expect(parser.parseDeclaration(statement)).toBeInstanceOf(SapError);
    });

    test('no closing parenthesis gives error', () => {
      const tokens = ['def', 'birch', '(', 'spruce', ',', 'redwood', ':'].map(makeToken);
      const statement = makeStatement(tokens, 0);
      expect(parser.parseDeclaration(statement)).toBeInstanceOf(SapError);
    });

    test('no colon gives error', () => {
      const tokens = ['def', 'birch', '(', 'spruce', ',', 'redwood', ')'].map(makeToken);
      const statement = makeStatement(tokens, 0);
      expect(parser.parseDeclaration(statement)).toBeInstanceOf(SapError);
    });

    test('double comma gives error', () => {
      const tokens = ['def', 'birch', '(', 'spruce', ',', ',', ')', ':'].map(makeToken);
      const statement = makeStatement(tokens, 0);
      expect(parser.parseDeclaration(statement)).toBeInstanceOf(SapError);
    });

    test('no parameter after comma gives error', () => {
      const tokens = ['def', 'birch', '(', 'spruce', ',', ')', ':'].map(makeToken);
      const statement = makeStatement(tokens, 0);
      expect(parser.parseDeclaration(statement)).toBeInstanceOf(SapError);
    });

    test('extra tokens at end give error', () => {
      const tokens = ['def', 'birch', '(', 'spruce', ',', 'redwood', ')', ':', 'oops'].map(makeToken);
      const statement = makeStatement(tokens, 0);
      expect(parser.parseDeclaration(statement)).toBeInstanceOf(SapError);
    });

    test('no def gives error', () => {
      const tokens = ['birch', '(', 'spruce', ',', 'redwood', ')', ':'].map(makeToken);
      const statement = makeStatement(tokens, 0);
      expect(parser.parseDeclaration(statement)).toBeInstanceOf(SapError);
    });

    test('invalid function name gives error', () => {
      const tokens = ['def', '1birch', '(', 'spruce', ',', 'redwood', ')', ':'].map(makeToken);
      const statement = makeStatement(tokens, 0);
      expect(parser.parseDeclaration(statement)).toBeInstanceOf(SapError);
    });

    test('invalid argument name gives error', () => {
      const tokens = ['def', 'birch', '(', 's-p-r-u-c-e', ',', 'redwood', ')', ':'].map(makeToken);
      const statement = makeStatement(tokens, 0);
      expect(parser.parseDeclaration(statement)).toBeInstanceOf(SapError);
    });

    test('unexpected token instead of colon gives error', () => {
      const tokens = ['def', 'birch', '(', 'spruce', ',', 'redwood', ')', 'unexpected'].map(makeToken);
      const statement = makeStatement(tokens, 0);
      expect(parser.parseDeclaration(statement)).toBeInstanceOf(SapError);
    });
  });
});
