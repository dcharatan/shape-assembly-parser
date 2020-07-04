import Token from '../token/Token';

export default class Invocation {
  constructor(public definitionToken: Token, public argumentTokens: Token[], public assignmentToken?: Token) {}
}
