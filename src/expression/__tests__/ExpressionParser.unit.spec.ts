import ExpressionParser from '../ExpressionParser';
import Token from '../../token/Token';
import ExpressionNode from '../ExpressionNode';
import SapError from '../../error/SapError';

const makeToken = (text: string) => new Token(text, 0, 1);

describe('ExpressionParser Unit Tests', () => {
  let expressionParser: ExpressionParser;

  beforeEach(() => {
    expressionParser = new ExpressionParser();
  });

  describe('parseExpression', () => {
    describe('order of operations', () => {
      test('5 + 3 * 1', () => {
        const given = ['5', '+', '3', '*', '1'].map(makeToken);
        const expected = new ExpressionNode(given[1], [
          new ExpressionNode(given[0], []),
          new ExpressionNode(given[3], [new ExpressionNode(given[2], []), new ExpressionNode(given[4], [])]),
        ]);
        expect(expressionParser.parseExpression(given)).toEqual(expected);
      });

      test('5 * 3 + 1', () => {
        const given = ['5', '*', '3', '+', '1'].map(makeToken);
        const expected = new ExpressionNode(given[3], [
          new ExpressionNode(given[1], [new ExpressionNode(given[0], []), new ExpressionNode(given[2], [])]),
          new ExpressionNode(given[4], []),
        ]);
        expect(expressionParser.parseExpression(given)).toEqual(expected);
      });

      test('(5 + 3) * 1', () => {
        const given = ['(', '5', '+', '3', ')', '*', '1'].map(makeToken);
        const expected = new ExpressionNode(given[5], [
          new ExpressionNode(given[2], [new ExpressionNode(given[1], []), new ExpressionNode(given[3], [])]),
          new ExpressionNode(given[6], []),
        ]);
        expect(expressionParser.parseExpression(given)).toEqual(expected);
      });

      test('5 + (3 * 1)', () => {
        const given = ['5', '+', '(', '3', '*', '1', ')'].map(makeToken);
        const expected = new ExpressionNode(given[1], [
          new ExpressionNode(given[0], []),
          new ExpressionNode(given[4], [new ExpressionNode(given[3], []), new ExpressionNode(given[5], [])]),
        ]);
        expect(expressionParser.parseExpression(given)).toEqual(expected);
      });

      test('5 * 3 / 1', () => {
        const given = ['5', '*', '3', '/', '1'].map(makeToken);
        const expected = new ExpressionNode(given[1], [
          new ExpressionNode(given[0], []),
          new ExpressionNode(given[3], [new ExpressionNode(given[2], []), new ExpressionNode(given[4], [])]),
        ]);
        expect(expressionParser.parseExpression(given)).toEqual(expected);
      });

      test('-5 * 3 / -1', () => {
        const given = ['-', '5', '*', '3', '/', '-', '1'].map(makeToken);
        const expected = new ExpressionNode(given[2], [
          new ExpressionNode(given[0], [
            new ExpressionNode(given[1], []),
          ]),
          new ExpressionNode(given[4], [
            new ExpressionNode(given[3], []),
            new ExpressionNode(given[5], [
              new ExpressionNode(given[6], []),
            ]),
          ]),
        ]);
        expect(expressionParser.parseExpression(given)).toEqual(expected);
      });
    });

    describe('unary operators', () => {
      test('-1', () => {
        const given = ['-', '1'].map(makeToken);
        const expected = new ExpressionNode(given[0], [new ExpressionNode(given[1], [])]);
        expect(expressionParser.parseExpression(given)).toEqual(expected);
      });

      test('-1 + 2', () => {
        const given = ['-', '1', '+', '2'].map(makeToken);
        const expected = new ExpressionNode(given[2], [
          new ExpressionNode(given[0], [new ExpressionNode(given[1], [])]),
          new ExpressionNode(given[3], []),
        ]);
        expect(expressionParser.parseExpression(given)).toEqual(expected);
      });

      test('-1 - -2', () => {
        const given = ['-', '1', '-', '-', '2'].map(makeToken);
        const expected = new ExpressionNode(given[2], [
          new ExpressionNode(given[0], [new ExpressionNode(given[1], [])]),
          new ExpressionNode(given[3], [new ExpressionNode(given[4], [])]),
        ]);
        expect(expressionParser.parseExpression(given)).toEqual(expected);
      });
    });

    describe('simple expressions', () => {
      test('1', () => {
        const given = ['1'].map(makeToken);
        const expected = new ExpressionNode(given[0], []);
        expect(expressionParser.parseExpression(given)).toEqual(expected);
      });

      test('(1)', () => {
        const given = ['(', '1', ')'].map(makeToken);
        const expected = new ExpressionNode(given[1], []);
        expect(expressionParser.parseExpression(given)).toEqual(expected);
      });

      test('(1) + (2)', () => {
        const given = ['(', '1', ')', '+', '(', '2', ')'].map(makeToken);
        const expected = new ExpressionNode(given[3], [
          new ExpressionNode(given[1], []),
          new ExpressionNode(given[5], []),
        ]);
        expect(expressionParser.parseExpression(given)).toEqual(expected);
      });

      test('1 / (2)', () => {
        const given = ['1', '/', '(', '2', ')'].map(makeToken);
        const expected = new ExpressionNode(given[1], [
          new ExpressionNode(given[0], []),
          new ExpressionNode(given[3], []),
        ]);
        expect(expressionParser.parseExpression(given)).toEqual(expected);
      });
    });

    describe('error handling', () => {
      test('(', () => {
        const given = ['('].map(makeToken);
        expect(expressionParser.parseExpression(given)).toBeInstanceOf(SapError);
      });

      test(')', () => {
        const given = [')'].map(makeToken);
        expect(expressionParser.parseExpression(given)).toBeInstanceOf(SapError);
      });

      test('*', () => {
        const given = ['*'].map(makeToken);
        expect(expressionParser.parseExpression(given)).toBeInstanceOf(SapError);
      });

      test('1 (+) 1', () => {
        const given = ['1', '(', '+', ')', '1'].map(makeToken);
        expect(expressionParser.parseExpression(given)).toBeInstanceOf(SapError);
      });

      test('1 () 1', () => {
        const given = ['1', '(', ')', '1'].map(makeToken);
        expect(expressionParser.parseExpression(given)).toBeInstanceOf(SapError);
      });

      test('1 () + 1', () => {
        const given = ['1', '(', ')', '+', '1'].map(makeToken);
        expect(expressionParser.parseExpression(given)).toBeInstanceOf(SapError);
      });

      test('1 (1)', () => {
        const given = ['1', '(', '1', ')'].map(makeToken);
        expect(expressionParser.parseExpression(given)).toBeInstanceOf(SapError);
      });

      test('1 * ((1)', () => {
        const given = ['1', '*', '(', '(', '1', ')'].map(makeToken);
        expect(expressionParser.parseExpression(given)).toBeInstanceOf(SapError);
      });

      test('1 * (1 *)', () => {
        const given = ['1', '*', '(', '1', '*', ')'].map(makeToken);
        expect(expressionParser.parseExpression(given)).toBeInstanceOf(SapError);
      });

      test('1 * )', () => {
        const given = ['1', '*', ')'].map(makeToken);
        expect(expressionParser.parseExpression(given)).toBeInstanceOf(SapError);
      });
    });
  });
});
