import Token from '../token/Token';

export default class Placeholder {
  private text: string | undefined;

  constructor(public readonly forAssembly: boolean, public assignmentToken?: Token) {}

  public fill(text: string): void {
    this.text = text;
  }

  public getText(): string {
    if (!this.text) {
      throw new Error('Placeholder has not yet been filled.');
    }
    return this.text;
  }
}
