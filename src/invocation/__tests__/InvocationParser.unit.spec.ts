import InvocationParser from '../InvocationParser';
import Statement from '../../statement/Statement';
import Token from '../../token/Token';
import SapError from '../../error/SapError';

const makeToken = (text: string) => new Token(text, 0, 1);
const makeStatement = (tokens: Token[], indentation: number) => new Statement(tokens, indentation);

describe('InvocationParser Unit Tests', () => {
  let parser: InvocationParser;

  beforeEach(() => {
    parser = new InvocationParser();
  });

  describe('parseInvocation', () => {
    test('correct parsing for invocation with no arguments', () => {
      const tokens = ['crocodile', '(', ')'].map(makeToken);
      const statement = makeStatement(tokens, 1);
      expect(parser.parseInvocation(statement)).toEqual({
        definitionToken: tokens[0],
        argumentTokens: [],
        assignmentToken: undefined,
      });
    });

    test('correct parsing for invocation with arguments', () => {
      const tokens = ['alligator', '(', 'one', ',', 'two', ')'].map(makeToken);
      const statement = makeStatement(tokens, 1);
      expect(parser.parseInvocation(statement)).toEqual({
        definitionToken: tokens[0],
        argumentTokens: [tokens[2], tokens[4]],
        assignmentToken: undefined,
      });
    });

    test('correct parsing for assigned invocation', () => {
      const tokens = ['bug', '=', 'beetle', '(', 'one', ')'].map(makeToken);
      const statement = makeStatement(tokens, 1);
      expect(parser.parseInvocation(statement)).toEqual({
        definitionToken: tokens[2],
        argumentTokens: [tokens[4]],
        assignmentToken: tokens[0],
      });
    });

    test('missing assignment name gives error', () => {
      const tokens = ['=', 'beetle', '(', 'one', ',', 'two', ')'].map(makeToken);
      const statement = makeStatement(tokens, 1);
      expect(parser.parseInvocation(statement)).toBeInstanceOf(SapError);
    });

    test('missing opening parenthesis gives error', () => {
      const tokens = ['bug', '=', 'beetle', 'one', ',', 'two', ')'].map(makeToken);
      const statement = makeStatement(tokens, 1);
      expect(parser.parseInvocation(statement)).toBeInstanceOf(SapError);
    });

    test('missing closing parenthesis gives error', () => {
      const tokens = ['bug', '=', 'beetle', '(', 'one', ',', 'two'].map(makeToken);
      const statement = makeStatement(tokens, 1);
      expect(parser.parseInvocation(statement)).toBeInstanceOf(SapError);
    });

    test('missing argument name gives error', () => {
      const tokens = ['bug', '=', 'beetle', '(', 'one', ',', ')'].map(makeToken);
      const statement = makeStatement(tokens, 1);
      expect(parser.parseInvocation(statement)).toBeInstanceOf(SapError);
    });

    test('bad indentation gives error', () => {
      const tokens = ['bug', '=', 'beetle', '(', 'one', ',', 'two', ')'].map(makeToken);
      const statement = makeStatement(tokens, 0);
      expect(parser.parseInvocation(statement)).toBeInstanceOf(SapError);
    });

    test('double comma gives error', () => {
      const tokens = ['bug', '=', 'beetle', '(', 'one', ',', ',', ')'].map(makeToken);
      const statement = makeStatement(tokens, 1);
      expect(parser.parseInvocation(statement)).toBeInstanceOf(SapError);
    });

    test('invalid function name gives error', () => {
      const tokens = ['1bug', '=', 'beetle', '(', 'one', ',', 'two', ',', 'three', ')'].map(makeToken);
      const statement = makeStatement(tokens, 1);
      expect(parser.parseInvocation(statement)).toBeInstanceOf(SapError);
    });

    test('invalid function name gives error', () => {
      const tokens = ['bug', '=', 'beetle', '(', 'one', ',', '2two', ',', 'three', ')'].map(makeToken);
      const statement = makeStatement(tokens, 1);
      expect(parser.parseInvocation(statement)).toBeInstanceOf(SapError);
    });

    test('extra token gives error', () => {
      const tokens = ['bug', '=', 'beetle', '(', 'one', ',', 'two', ',', 'three', ')', 'whoops'].map(makeToken);
      const statement = makeStatement(tokens, 1);
      expect(parser.parseInvocation(statement)).toBeInstanceOf(SapError);
    });

    test('separator instead of closing parenthesis gives error', () => {
      const tokens = ['bug', '=', 'beetle', '(', 'one', ',', 'two', ',', 'three', '='].map(makeToken);
      const statement = makeStatement(tokens, 1);
      expect(parser.parseInvocation(statement)).toBeInstanceOf(SapError);
    });

    test('comma instead of closing parenthesis gives error', () => {
      const tokens = ['beetle', '(', ','].map(makeToken);
      const statement = makeStatement(tokens, 1);
      expect(parser.parseInvocation(statement)).toBeInstanceOf(SapError);
    });
  });
});
