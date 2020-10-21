export interface TokenJSON {
  start: number;
  end: number;
  text: string;
}

export default class Token {
  constructor(public text: string, public start: number, public end: number) {}

  public get isNewline(): boolean {
    return this.text === '\n';
  }

  public get isWhitespace(): boolean {
    return !this.isNewline && !this.text.trim();
  }

  public toJson(): TokenJSON {
    return {
      start: this.start,
      end: this.end,
      text: this.text,
    };
  }
}
