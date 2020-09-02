import SapErrorWithToken from './SapErrorWithToken';
import Token from '../token/Token';

export default class IncompleteDefinitionError extends SapErrorWithToken {
  constructor(token: Token) {
    super(token);
  }

  public get message(): string {
    return `IncompleteDefinitionError: Expected function definition.`;
  }
}
