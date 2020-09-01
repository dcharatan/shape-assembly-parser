import SapErrorWithToken from './SapErrorWithToken';
import Token from '../token/Token';

export default class NotDeclaredError extends SapErrorWithToken {
  constructor(token: Token) {
    super(token);
  }

  public get message(): string {
    return 'NotDeclaredError: Function or variable has not been declared.';
  }
}
