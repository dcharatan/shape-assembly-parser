import Token from '../token/Token';

export default class Invocation {
  constructor(
    public readonly definitionToken: Token,
    public readonly argumentTokens: Token[][],
    public readonly assignmentToken?: Token,
  ) {}
}
