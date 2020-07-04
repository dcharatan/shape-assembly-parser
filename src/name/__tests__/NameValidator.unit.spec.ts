import NameValidator from '../NameValidator';

describe('NameValidator Unit Tests', () => {
  let validator: NameValidator;

  beforeEach(() => {
    validator = new NameValidator();
  });

  describe('isValidName', () => {
    test('only letters is valid', () => {
      expect(validator.isValidName('porcupine')).toBe(true);
    });

    test('snake case is valid', () => {
      expect(validator.isValidName('big_python_fan')).toBe(true);
    });

    test('number in name are valid', () => {
      expect(validator.isValidName('variable123')).toBe(true);
    });

    test('underscore at beginning of name is valid', () => {
      expect(validator.isValidName('__mifflin__')).toBe(true);
    });

    test('non-alphanumeric/underscore is invalid', () => {
      expect(validator.isValidName('**bad**')).toBe(false);
    });

    test('spaces are invalid', () => {
      expect(validator.isValidName('really bad')).toBe(false);
    });

    test('numbers at beginning are invalid', () => {
      expect(validator.isValidName('123hello')).toBe(false);
    });

    test('kebab case is invalid', () => {
      expect(validator.isValidName('carrot-zucchini-tomato')).toBe(false);
    });
  });
});
