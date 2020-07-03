import SapErrorWithToken from './SapErrorWithToken';
import Token from '../token/Token';

export default class TabError extends SapErrorWithToken {
  constructor(token: Token) {
    super(token);
  }

  public get message(): string {
    return 'TabError: Expected spaces but received tab.';
  }
}
