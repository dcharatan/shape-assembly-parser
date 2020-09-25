import Token from '../token/Token';

export default class ReturnStatement {
  constructor(public readonly tokens: Token[]) {}
}
