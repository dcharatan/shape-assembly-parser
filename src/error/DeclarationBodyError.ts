import SapErrorWithToken from './SapErrorWithToken';
import Token from '../token/Token';

export default class DeclarationBodyError extends SapErrorWithToken {
  constructor(token: Token) {
    super(token);
  }

  public get message(): string {
    return 'DeclarationBodyError: Expected declaration body.';
  }
}
