import Token from '../token/Token';

export default class Placeholder {
  private text: string | undefined;
  public readonly forAssembly: boolean;

  constructor(public readonly assemblyName?: string, public assignmentToken?: Token) {
    this.forAssembly = assemblyName !== undefined;
  }

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
