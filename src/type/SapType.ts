import Token from '../token/Token';
import SapError from '../error/SapError';

export default abstract class SapType<T> {
  // For a unit float, the value 1.23 should be parsed without an error.
  // The validation is what later causes the error.
  abstract parse(token: Token): T | SapError;

  abstract name: string;
  abstract readonly validOperators: Set<string>;

  // Evaluate the operator for the specified operands.
  // Return an error if the operator isn't supported.
  abstract evaluate(operands: T[], operator: Token): T | SapError;

  // Validation confirms that the given value matches the type.
  // For example, the TwoLetterString type would accept "hi" but reject "hello" during validation.
  // Likewise, UnitFloat would accept 0.38 but reject 123.0 during validation.
  // In the above examples, both 123.0 and "hello" would have been parsed without errors.
  validate(expressionValue: T, _expressionTokens: Token[]): SapError | T {
    return expressionValue;
  }
}
