import SapErrorWithToken from './SapErrorWithToken';
import Token from '../token/Token';

export default class IndentationLevelError extends SapErrorWithToken {
  constructor(token: Token, private expectedLevels: number, private receivedLevels: number) {
    super(token);
  }

  public get message(): string {
    return `IndentationLevelError: Expected indentation of ${this.expectedLevels} levels but received indentation of ${this.receivedLevels} levels.`;
  }
}
