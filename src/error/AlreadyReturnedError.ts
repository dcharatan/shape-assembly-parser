import SapErrorWithToken from './SapErrorWithToken';
import Token from '../token/Token';

export default class AlreadyReturnedError extends SapErrorWithToken {
  constructor(token: Token) {
    super(token);
  }

  public get message(): string {
    return 'AlreadyReturnedError: This function already returned a value on a previous line.';
  }
}
