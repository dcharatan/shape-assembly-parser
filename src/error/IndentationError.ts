import SapErrorWithToken from './SapErrorWithToken';
import Token from '../token/Token';

export default class IndentationError extends SapErrorWithToken {
  constructor(token: Token, private spacesPerIndentation: number, private numSpaces: number) {
    super(token);
  }

  public get message(): string {
    return `IndentationError: Expected a multiple of ${this.spacesPerIndentation} spaces but received ${this.numSpaces}.`;
  }
}
