import Token from '../token/Token';

export default class Statement {
  constructor(public tokens: Token[], public indentationLevel: number) {}
}
