import Token from '../token/Token';
import SapError from '../error/SapError';
import SapType from './SapType';
import SapTypeError from '../error/SapTypeError';
import DivisionByZeroError from '../error/DivisionByZeroError';

export const floatSubstitutionValues = ['f_bb_x', 'f_bb_y', 'f_bb_z'];

type SapFloatValue = number | string;
export default class SapFloat extends SapType<SapFloatValue> {
  public validOperators = new Set<string>(['*', '/', '+', '-']);

  parse(token: Token): SapFloatValue | SapError {
    // This special case allows for transpilation to use f_bb_x, f_bb_y and f_bb_z in a postprocessing step.
    if (floatSubstitutionValues.includes(token.text)) {
      return token.text;
    }
    const asFloat = Number(token.text);
    return Number.isNaN(asFloat) ? new SapTypeError(token, this) : asFloat;
  }

  public get name(): string {
    return 'float';
  }

  public evaluate(operands: SapFloatValue[], operator: Token): SapFloatValue | SapError {
    const operatorText = operator.text;
    const lhs = operands[0];
    if (typeof lhs === 'string') {
      return lhs;
    }
    if (operands.length === 1) {
      if (operatorText === '+') {
        return lhs;
      } else if (operatorText === '-') {
        return -lhs;
      }
    } else if (operands.length === 2) {
      const rhs = operands[1];
      if (typeof rhs === 'string') {
        return rhs;
      }
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
