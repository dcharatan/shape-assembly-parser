import SapErrorWithToken from './SapErrorWithToken';
import Token from '../token/Token';

export default class DivisionByZeroError extends SapErrorWithToken {
  constructor(token: Token) {
    super(token);
  }

  public get message(): string {
    return 'DivisionByZeroError: Cannot divide by zero.';
  }
}
