import Token from '../../token/Token';
import StatementParser from '../StatementParser';
import Statement from '../Statement';
import TabError from '../../error/TabError';
import IndentationError from '../../error/IndentationError';

const makeToken = (name: string): Token => new Token(name, 0, 0);

describe('StatementParser Unit Tests', () => {
  let statementParser: StatementParser;

  beforeEach(() => {
    statementParser = new StatementParser();
  });

  describe('parseStatements', () => {
    test('Single line without indentation produces one statement and no errors.', () => {
      const tokens = ['def', ' ', 'functionName', '(', ')'].map(makeToken);
      const result = statementParser.parseStatements(tokens);
      expect(result).toEqual({
        statements: [new Statement([tokens[0], ...tokens.slice(2, 5)], 0)],
        errors: [],
      });
    });

    test('Whitespace lines produce no statements.', () => {
      const tokens = ['\n', '    ', '\n', '\n', '\t    \t  ', '\n'].map(makeToken);
      const result = statementParser.parseStatements(tokens);
      expect(result).toEqual({
        statements: [],
        errors: [],
      });
    });

    test('Newlines between statements do not produce statements.', () => {
      const tokens = ['statement 1', '\n', '\n', '\n', 'statement 2', '\n', '\n'].map(makeToken);
      const result = statementParser.parseStatements(tokens);
      expect(result).toEqual({
        statements: [new Statement([tokens[0]], 0), new Statement([tokens[4]], 0)],
        errors: [],
      });
    });

    test('Whitespace containing tabs produces error.', () => {
      const tokens = ['\t   ', 'hello', '\n'].map(makeToken);
      const result = statementParser.parseStatements(tokens);
      expect(result).toEqual({
        statements: [],
        errors: [new TabError(tokens[0])],
      });
    });

    test('Incorrect number of spaces produces error.', () => {
      const tokens = ['   ', 'celery', '\n'].map(makeToken);
      const result = statementParser.parseStatements(tokens);
      expect(result).toEqual({
        statements: [],
        errors: [new IndentationError(tokens[0], StatementParser.SPACES_PER_INDENTATION, 3)],
      });
    });

    test('Error in one statement does not derail parsing.', () => {
      const tokens = ['\t', 'potato', '\n', 'carrot', '\n'].map(makeToken);
      const result = statementParser.parseStatements(tokens);
      expect(result).toEqual({
        statements: [new Statement([tokens[3]], 0)],
        errors: [new TabError(tokens[0])],
      });
    });

    test('Indentation level is detected correctly.', () => {
      const tokens = ['            ', 'watercolor', '\n'].map(makeToken);
      const result = statementParser.parseStatements(tokens);
      expect(result).toEqual({
        statements: [new Statement([tokens[1]], 3)],
        errors: [],
      });
    });
  });
});
