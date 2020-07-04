import SapErrorWithToken from './SapErrorWithToken';
import Token from '../token/Token';

export default class AlreadyDeclaredError extends SapErrorWithToken {
  constructor(token: Token) {
    super(token);
  }

  public get message(): string {
    return 'AlreadyDeclaredError: Function or variable has already been declared.';
  }
}
