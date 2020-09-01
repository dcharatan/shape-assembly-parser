export default class Operator {
  constructor(public readonly symbol: string, public readonly priority: number, public readonly isUnary: boolean) {}
}
