import Declaration from './Declaration';
import SapError from '../error/SapError';
import Statement from '../statement/Statement';
import DEF_KEYWORD from './DefKeyword';
import Token from '../token/Token';
import UnexpectedTokenError from '../error/UnexpectedTokenError';
import NameValidator from '../name/NameValidator';
import NameError from '../error/NameError';
import IndentationLevelError from '../error/IndentationLevelError';

type Expectation =
  | 'DEF'
  | 'FUNCTION_NAME'
  | 'OPENING_PARENTHESIS'
  | 'PARAMETER_NAME_OR_CLOSING_PARENTHESIS'
  | 'COMMA_OR_CLOSING_PARENTHESIS'
  | 'PARAMETER_NAME'
  | 'COLON'
  | 'END';

export default class DeclarationParser {
  private nameValidator: NameValidator = new NameValidator();
  private nameToken?: Token = undefined;
  private parameterTokens: Token[] = [];

  public parseDeclaration(statement: Statement): Declaration | SapError {
    // Validate indentation level.
    if (statement.indentationLevel !== 0) {
      return new IndentationLevelError(statement.tokens[0], 0, statement.indentationLevel);
    }

    // Run state machine.
    this.nameToken = undefined;
    this.parameterTokens = [];
    let expectation: Expectation = 'DEF';
    for (const token of statement.tokens) {
      const result = this.reducer(token, expectation);
      if (result instanceof SapError) {
        return result;
      }
      expectation = result;
    }

    // Validate final state.
    if (expectation !== 'END' || !this.nameToken) {
      return new UnexpectedTokenError(statement.tokens[statement.tokens.length - 1], 'complete function declaration');
    }
    return new Declaration(this.nameToken, this.parameterTokens);
  }

  private reducer(token: Token, expectation: Expectation): Expectation | SapError {
    switch (expectation) {
      case 'DEF':
        return token.text === DEF_KEYWORD ? 'FUNCTION_NAME' : new UnexpectedTokenError(token, DEF_KEYWORD);

      case 'FUNCTION_NAME':
        if (!this.nameValidator.isValidName(token.text)) {
          return new NameError(token);
        }
        this.nameToken = token;
        return 'OPENING_PARENTHESIS';

      case 'OPENING_PARENTHESIS':
        return token.text === '('
          ? 'PARAMETER_NAME_OR_CLOSING_PARENTHESIS'
          : new UnexpectedTokenError(token, 'opening parenthesis');

      case 'PARAMETER_NAME_OR_CLOSING_PARENTHESIS':
        if (this.nameValidator.isValidName(token.text)) {
          this.parameterTokens.push(token);
          return 'COMMA_OR_CLOSING_PARENTHESIS';
        }
        return token.text === ')' ? 'COLON' : new UnexpectedTokenError(token, 'parameter name or closing parenthesis');

      case 'COMMA_OR_CLOSING_PARENTHESIS':
        if (token.text === ',') {
          return 'PARAMETER_NAME';
        }
        return token.text === ')' ? 'COLON' : new UnexpectedTokenError(token, 'comma or closing parenthesis');

      case 'PARAMETER_NAME':
        if (this.nameValidator.isValidName(token.text)) {
          this.parameterTokens.push(token);
          return 'COMMA_OR_CLOSING_PARENTHESIS';
        }
        return new NameError(token);

      case 'COLON':
        return token.text === ':' ? 'END' : new UnexpectedTokenError(token, 'colon');

      case 'END':
        return new UnexpectedTokenError(token, 'newline');
    }
  }
}
