export default class NameValidator {
  public isValidName(name: string): boolean {
    const matches = name.match(/^[a-zA-Z0-9_]*$/g);
    if (!matches || !matches.includes(name)) {
      return false;
    }
    return !name.charAt(0).match(/[0-9]/g);
  }
}
