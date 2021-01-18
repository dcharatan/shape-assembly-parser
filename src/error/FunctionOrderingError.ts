import SapErrorWithToken from './SapErrorWithToken';
import Token from '../token/Token';

export default class FunctionOrderingErrorr extends SapErrorWithToken {
  constructor(token: Token) {
    super(token);
  }

  public get message(): string {
    return 'FunctionOrderingErrorr: No valid function ordering exists.';
  }
}
