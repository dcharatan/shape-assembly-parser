import Token from '../../token/Token';
import ExpressionNode from '../ExpressionNode';
import SapInteger from '../../type/SapInteger';
import SapBoolean from '../../type/SapBoolean';
import SapError from '../../error/SapError';

const makeToken = (text: string) => new Token(text, 0, 1);
const makeExpression = (text: string, children: ExpressionNode[] = []) => new ExpressionNode(makeToken(text), children);

describe('ExpressionNode Unit Tests', () => {
  describe('evaluate', () => {
    test('evaluation of simple arithmetic', () => {
      const expression = makeExpression('*', [makeExpression('5'), makeExpression('3')]);
      expect(expression.evaluate(new SapInteger(), new Map())).toBe(15);
    });

    test('evaluation with variable', () => {
      const expression = makeExpression('*', [makeExpression('5'), makeExpression('int_var')]);
      const map = new Map<string, number>();
      map.set('int_var', 7);
      expect(expression.evaluate(new SapInteger(), map)).toBe(35);
    });

    describe('error handling', () => {
      test('unsupported operator gives error', () => {
        const expression = makeExpression('*', [makeExpression('True'), makeExpression('False')]);
        expect(() => expression.evaluate(new SapBoolean(), new Map())).toThrow();
      });

      test('operand that cannot be parsed gives error', () => {
        const expression = makeExpression('*', [makeExpression('3'), makeExpression('False')]);
        expect(expression.evaluate(new SapInteger(), new Map())).toBeInstanceOf(SapError);
      });
    });
  });
});
