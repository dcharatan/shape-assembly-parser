import Token from '../token/Token';
import SapError from '../error/SapError';
import SapTypeError from '../error/SapTypeError';
import SapFloat from './SapFloat';
import DivisionByZeroError from '../error/DivisionByZeroError';

export default class SapInteger extends SapFloat {
  parse(token: Token): number | SapError {
    const result = super.parse(token);
    if (!(typeof result === 'string' || result instanceof String) && (result instanceof SapError || result === Math.trunc(result))) {
      return result;
    }
    return new SapTypeError(token, this);
  }

  public get name(): string {
    return 'integer';
  }

  public evaluate(operands: number[], operator: Token): number | SapError {
    const operatorText = operator.text;
    const lhs = operands[0];
    if (operands.length === 1) {
      if (operatorText === '+') {
        return lhs;
      } else if (operatorText === '-') {
        return -lhs;
      }
    } else if (operands.length === 2) {
      const rhs = operands[1];
      if (operatorText === '+') {
        return lhs + rhs;
      } else if (operatorText === '-') {
        return lhs - rhs;
      } else if (operatorText === '*') {
        return lhs * rhs;
      } else if (operatorText === '/') {
        if (rhs === 0) {
          return new DivisionByZeroError(operator);
        }
        return Math.floor(lhs / rhs);
      }
    }
    throw new Error('unsupported operator');
  }
}
