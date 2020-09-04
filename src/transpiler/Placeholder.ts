export default class Placeholder {
  private text: string | undefined;

  constructor(public readonly forAssembly: boolean = false) {}

  public fill(text: string) {
    this.text = text;
  }

  public getText(): string {
    if (!this.text) {
      return this.forAssembly ? 'ASSEMBLY' : 'CUBOID';
      //throw new Error('Placeholder has not yet been filled.');
    }
    return this.text;
  }
}
