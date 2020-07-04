import SapErrorWithToken from './SapErrorWithToken';
import Token from '../token/Token';

export default class UnexpectedAssignmentError extends SapErrorWithToken {
  constructor(token: Token) {
    super(token);
  }

  public get message(): string {
    return 'UnexpectedAssignmentError: Cannot assign function with void return type to variable.';
  }
}
