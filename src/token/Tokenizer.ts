import Token from './Token';
import separators from './separators';

export default class Tokenizer {
  public isSeparator(text: string): boolean {
    return separators.has(text);
  }

  public isNonSeparatorWhitespace(text: string): boolean {
    return !this.isSeparator(text) && !text.trim();
  }

  public tokenize(text: string): Token[] {
    const tokens: Token[] = [];

    let tokenStart = 0;
    const pushToken = (start: number, end: number) => {
      if (start !== end) {
        tokens.push(new Token(text.slice(start, end), start, end));
      }
      tokenStart = end;
    };

    let charWasWhitespace = this.isNonSeparatorWhitespace(text.charAt(0));
    for (let i = 0; i < text.length; i += 1) {
      const char = text.charAt(i);
      const charIsWhitespace = this.isNonSeparatorWhitespace(char);
      if (this.isSeparator(char)) {
        pushToken(tokenStart, i);
        pushToken(i, i + 1);
      } else if (charWasWhitespace !== charIsWhitespace) {
        pushToken(tokenStart, i);
      }
      charWasWhitespace = charIsWhitespace;
    }

    pushToken(tokenStart, text.length);
    return tokens;
  }
}
