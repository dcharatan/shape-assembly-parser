import Token from '../token/Token';

export default class Declaration {
  constructor(public nameToken: Token, public parameterTokens: Token[]) {}
}
