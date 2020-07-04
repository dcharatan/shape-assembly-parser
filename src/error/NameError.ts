import SapErrorWithToken from './SapErrorWithToken';
import Token from '../token/Token';

export default class NameError extends SapErrorWithToken {
  constructor(token: Token) {
    super(token);
  }

  public get message(): string {
    return `NameError: Names must consist of alphanumeric characters and underscores and may not start with a digit. The token "${this.token.text}" is not a valid name.`;
  }
}
