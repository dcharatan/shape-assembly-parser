import separators from '../token/separators';
import DEF_KEYWORD from '../definition/DefKeyword';

export default class NameValidator {
  private readonly RESERVED_KEYWORDS = [
    'True',
    'False',
    ...Array.from(separators),
    DEF_KEYWORD,
    'X',
    'Y',
    'Z',
    'right',
    'left',
    'top',
    'bot',
    'front',
    'back',
    'return',
  ];

  public isValidName(name: string): boolean {
    const matches = name.match(/^[a-zA-Z0-9_]*$/g);
    if (!matches || !matches.includes(name)) {
      return false;
    }
    return !name.charAt(0).match(/[0-9]/g) && !this.RESERVED_KEYWORDS.includes(name);
  }
}
