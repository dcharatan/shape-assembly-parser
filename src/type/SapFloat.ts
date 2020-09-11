import Token from '../token/Token';
import SapError from '../error/SapError';
import SapType from './SapType';
import SapTypeError from '../error/SapTypeError';
import DivisionByZeroError from '../error/DivisionByZeroError';

export default class SapFloat extends SapType<number> {
  public validOperators = new Set<string>(['*', '/', '+', '-']);

  parse(token: Token): number | SapError {
    const asFloat = Number(token.text);
    return Number.isNaN(asFloat) ? new SapTypeError(token, this) : asFloat;
  }

  public get name(): string {
    return 'float';
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
        return lhs / rhs;
      }
    }
    throw new Error('unsupported operator');
  }
}
