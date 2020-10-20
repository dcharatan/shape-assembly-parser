import SapErrorWithToken from './SapErrorWithToken';
import Token from '../token/Token';

export default class UnexpectedReturnError extends SapErrorWithToken {
  constructor(token: Token) {
    super(token);
  }

  public get message(): string {
    return `UnexpectedReturnError: Assemblies should not return values.`;
  }
}
