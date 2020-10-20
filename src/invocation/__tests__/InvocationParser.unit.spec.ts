import InvocationParser from '../InvocationParser';
import Statement from '../../statement/Statement';
import Token from '../../token/Token';
import SapError from '../../error/SapError';
import ExpressionNode from '../../expression/ExpressionNode';

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
        argumentExpressions: [],
        assignmentTokens: [],
      });
    });

    test('correct parsing for invocation with arguments', () => {
      const tokens = ['alligator', '(', 'one', ',', 'two', ')'].map(makeToken);
      const statement = makeStatement(tokens, 1);
      expect(parser.parseInvocation(statement)).toEqual({
        definitionToken: tokens[0],
        argumentExpressions: [new ExpressionNode(tokens[2], []), new ExpressionNode(tokens[4], [])],
        assignmentTokens: [],
      });
    });

    test('correct parsing for assigned invocation', () => {
      const tokens = ['bug', '=', 'beetle', '(', 'one', ')'].map(makeToken);
      const statement = makeStatement(tokens, 1);
      expect(parser.parseInvocation(statement)).toEqual({
        definitionToken: tokens[2],
        argumentExpressions: [new ExpressionNode(tokens[4], [])],
        assignmentTokens: [tokens[0]],
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

    test('correct parsing for invocation with arguments which are numbers', () => {
      const tokens = ['alligator', '(', '1', ',', '2', ')'].map(makeToken);
      const statement = makeStatement(tokens, 1);
      expect(parser.parseInvocation(statement)).toEqual({
        definitionToken: tokens[0],
        argumentExpressions: [new ExpressionNode(tokens[2], []), new ExpressionNode(tokens[4], [])],
        assignmentTokens: [],
      });
    });

    test('multi-token single argument works', () => {
      const tokens = ['beetle', '(', '5', '*', '5', ')'].map(makeToken);
      const statement = makeStatement(tokens, 1);
      expect(parser.parseInvocation(statement)).toEqual({
        definitionToken: tokens[0],
        argumentExpressions: [
          new ExpressionNode(tokens[3], [new ExpressionNode(tokens[2], []), new ExpressionNode(tokens[4], [])]),
        ],
        assignmentTokens: [],
      });
    });

    test('multiple multi-token arguments work', () => {
      const tokens = ['beetle', '(', '5', '*', '5', ',', '3', ',', '2', '+', '3', ')'].map(makeToken);
      const statement = makeStatement(tokens, 1);
      expect(parser.parseInvocation(statement)).toEqual({
        definitionToken: tokens[0],
        argumentExpressions: [
          new ExpressionNode(tokens[3], [new ExpressionNode(tokens[2], []), new ExpressionNode(tokens[4], [])]),
          new ExpressionNode(tokens[6], []),
          new ExpressionNode(tokens[9], [new ExpressionNode(tokens[8], []), new ExpressionNode(tokens[10], [])]),
        ],
        assignmentTokens: [],
      });
    });

    test('no spurious assignment error for attach statement', () => {
      const tokens = [
        'attach',
        '(',
        'cub1',
        ',',
        'cub2',
        ',',
        '1',
        ',',
        '1',
        ',',
        '1',
        ',',
        '1',
        ',',
        '1',
        ',',
        '1',
        ')',
      ].map(makeToken);
      const statement = makeStatement(tokens, 1);
      expect(parser.parseInvocation(statement)).toEqual({
        definitionToken: tokens[0],
        argumentExpressions: tokens
          .filter((_, i) => i % 2 === 0 && i > 0)
          .map((token) => new ExpressionNode(token, [])),
        assignmentTokens: [],
      });
    });
  });
});
