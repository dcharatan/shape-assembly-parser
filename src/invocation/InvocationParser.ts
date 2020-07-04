import SapError from '../error/SapError';
import Statement from '../statement/Statement';
import Token from '../token/Token';
import UnexpectedTokenError from '../error/UnexpectedTokenError';
import NameValidator from '../name/NameValidator';
import NameError from '../error/NameError';
import Invocation from './Invocation';
import IndentationLevelError from '../error/IndentationLevelError';

type Expectation =
  | 'FUNCTION_NAME'
  | 'OPENING_PARENTHESIS'
  | 'ARGUMENT_NAME_OR_CLOSING_PARENTHESIS'
  | 'COMMA_OR_CLOSING_PARENTHESIS'
  | 'ARGUMENT_NAME'
  | 'END';

export default class InvocationParser {
  private nameValidator: NameValidator = new NameValidator();
  private assignmentToken?: Token = undefined;
  private definitionToken?: Token = undefined;
  private argumentTokens: Token[] = [];

  public parseInvocation(statement: Statement): Invocation | SapError {
    // Validate indentation level.
    if (statement.indentationLevel !== 1) {
      return new IndentationLevelError(statement.tokens[0], 0, statement.indentationLevel);
    }

    // Detect assignment.
    let invocationTokens = statement.tokens;
    if (statement.tokens.length > 2 && statement.tokens[1].text === '=') {
      invocationTokens = statement.tokens.slice(2);
      if (!this.nameValidator.isValidName(statement.tokens[0].text)) {
        return new NameError(statement.tokens[0]);
      }
      this.assignmentToken = statement.tokens[0];
    }

    // Run state machine.
    this.definitionToken = undefined;
    this.argumentTokens = [];
    let expectation: Expectation = 'FUNCTION_NAME';
    for (const token of invocationTokens) {
      const result = this.reducer(token, expectation);
      if (result instanceof SapError) {
        return result;
      }
      expectation = result;
    }

    // Validate final state.
    if (expectation !== 'END' || !this.definitionToken) {
      return new UnexpectedTokenError(statement.tokens[statement.tokens.length - 1], 'complete function declaration');
    }
    return new Invocation(this.definitionToken, this.argumentTokens, this.assignmentToken);
  }

  private reducer(token: Token, expectation: Expectation): Expectation | SapError {
    switch (expectation) {
      case 'FUNCTION_NAME':
        if (!this.nameValidator.isValidName(token.text)) {
          return new NameError(token);
        }
        this.definitionToken = token;
        return 'OPENING_PARENTHESIS';

      case 'OPENING_PARENTHESIS':
        return token.text === '('
          ? 'ARGUMENT_NAME_OR_CLOSING_PARENTHESIS'
          : new UnexpectedTokenError(token, 'opening parenthesis');

      case 'ARGUMENT_NAME_OR_CLOSING_PARENTHESIS':
        if (this.nameValidator.isValidName(token.text)) {
          this.argumentTokens.push(token);
          return 'COMMA_OR_CLOSING_PARENTHESIS';
        }
        return token.text === ')' ? 'END' : new UnexpectedTokenError(token, 'argument name or closing parenthesis');

      case 'COMMA_OR_CLOSING_PARENTHESIS':
        if (token.text === ',') {
          return 'ARGUMENT_NAME';
        }
        return token.text === ')' ? 'END' : new UnexpectedTokenError(token, 'comma or closing parenthesis');

      case 'ARGUMENT_NAME':
        if (this.nameValidator.isValidName(token.text)) {
          this.argumentTokens.push(token);
          return 'COMMA_OR_CLOSING_PARENTHESIS';
        }
        return new NameError(token);

      case 'END':
        return new UnexpectedTokenError(token, 'newline');
    }
  }
}
