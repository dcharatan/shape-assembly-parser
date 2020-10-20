import Token from '../token/Token';
import Statement from '../statement/Statement';
import SapError from '../error/SapError';
import IndentationLevelError from '../error/IndentationLevelError';
import NameError from '../error/NameError';
import NameValidator from '../name/NameValidator';
import Invocation from './Invocation';
import UnexpectedTokenError from '../error/UnexpectedTokenError';
import IncompleteInvocationError from '../error/IncompleteInvocationError';
import ExpressionParser from '../expression/ExpressionParser';
import ExpressionNode from '../expression/ExpressionNode';
import ReturnStatement from './ReturnStatement';

interface AssignmentStructure {
  assignmentTokens: Token[];
  invocationTokens: Token[];
}

interface DefinitionStructure {
  definitionToken: Token;
  argumentTokens: Token[];
}

export default class InvocationParser {
  private nameValidator = new NameValidator();
  private expressionParser = new ExpressionParser();

  public parseInvocation(statement: Statement): Invocation | SapError {
    // Validate indentation level.
    if (statement.indentationLevel !== 1) {
      return new IndentationLevelError(statement.tokens[0], 1, statement.indentationLevel);
    }

    // Parse assignment if it exists and extract the remaining invocation tokens.
    const parsedAssignment = this.parseAssignment(statement.tokens);
    if (parsedAssignment instanceof SapError) {
      return parsedAssignment;
    }

    // Make sure tokens remain.name
    if (parsedAssignment.invocationTokens.length === 0) {
      return new IncompleteInvocationError(statement.tokens[1], 'function name');
    }

    // Parse the definition name and extract any argument tokens.
    const parsedDefinition = this.parseDefinition(parsedAssignment.invocationTokens);
    if (parsedDefinition instanceof SapError) {
      return parsedDefinition;
    }

    // Parse the argument tokens.
    const argumentTokens = this.parseArguments(parsedDefinition.argumentTokens);
    if (argumentTokens instanceof SapError) {
      return argumentTokens;
    }

    // Parse each argument expression.
    const argumentExpressions = argumentTokens.map((tokens) => this.expressionParser.parseExpression(tokens));
    for (const argumentExpression of argumentExpressions) {
      if (argumentExpression instanceof SapError) {
        return argumentExpression;
      }
    }

    return new Invocation(
      parsedDefinition.definitionToken,
      argumentExpressions as ExpressionNode[],
      parsedAssignment.assignmentTokens,
    );
  }

  public parseReturn(tokens: Token[]): ReturnStatement | SapError {
    const returnValues: Token[] = [];
    for (const [index, token] of tokens.slice(1).entries()) {
      // Even indices must be valid names.
      if (index % 2 === 0) {
        if (this.nameValidator.isValidName(token.text)) {
          returnValues.push(token);
        } else {
          return new NameError(token);
        }
      }

      // Odd indices must be commas.
      else if (token.text !== ',' || index === tokens.length - 2) {
        return new UnexpectedTokenError(token, 'comma separating return values');
      }
    }
    return new ReturnStatement(returnValues, tokens[0]);
  }

  private parseAssignment(tokens: Token[]): AssignmentStructure | SapError {
    // There's no assignment if there are too few tokens or there's no equals sign.
    const equalsIndex = tokens.findIndex((token) => token.text === '=');
    if (tokens.length < 2 || equalsIndex === -1) {
      return {
        assignmentTokens: [],
        invocationTokens: tokens,
      };
    }

    // Parse the tokens before the equals sign.
    const assignmentTokens = [];
    for (let tokenIndex = 0; tokenIndex < equalsIndex; tokenIndex++) {
      const token = tokens[tokenIndex];
      if (tokenIndex % 2) {
        // Odd tokens should be commas.
        if (token.text !== ',') {
          return new UnexpectedTokenError(token, 'comma');
        }
      } else {
        if (!this.nameValidator.isValidName(tokens[0].text)) {
          return new NameError(tokens[0]);
        }
        assignmentTokens.push(token);
      }
    }

    // Make sure the last token isn't a comma.
    if (equalsIndex % 2 === 0) {
      return new UnexpectedTokenError(tokens[equalsIndex - 1], 'space between last assignment and equals sign');
    }

    // Successfully parse the assignment tokens.
    return {
      assignmentTokens,
      invocationTokens: tokens.slice(equalsIndex + 1),
    };
  }

  private parseDefinition(tokens: Token[]): DefinitionStructure | SapError {
    // The first token is the function name.
    const definitionToken = tokens[0];
    if (!this.nameValidator.isValidName(definitionToken.text)) {
      return new NameError(definitionToken);
    }

    // The second token is an opening parenthesis.
    if (tokens.length < 2) {
      return new IncompleteInvocationError(definitionToken, 'opening parenthesis');
    }
    const openingParenthesisToken = tokens[1];
    if (openingParenthesisToken.text !== '(') {
      return new UnexpectedTokenError(openingParenthesisToken, 'opening parenthesis');
    }

    // The final token is a closing parenthesis.
    if (tokens.length < 3) {
      return new IncompleteInvocationError(definitionToken, 'closing parenthesis');
    }
    const closingParenthesisToken = tokens[tokens.length - 1];
    if (closingParenthesisToken.text !== ')') {
      return new UnexpectedTokenError(openingParenthesisToken, 'closing parenthesis');
    }

    // To get the argument tokens, remove:
    // 1. Two tokens from the beginning (function name and opening parenthesis)
    // 2. One token from the end (closing parenthesis)
    return {
      definitionToken,
      argumentTokens: tokens.slice(2, tokens.length - 1),
    };
  }

  private parseArguments(tokens: Token[]): Token[][] | SapError {
    if (!tokens.length) {
      return [];
    }

    // The first token should not be a comma.
    if (tokens[0].text === ',') {
      return new UnexpectedTokenError(tokens[0], 'argument');
    }

    // Split the tokens by commas.
    const argumentGroups: Token[][] = [];
    let argumentGroup: Token[] = [];
    for (const token of tokens) {
      if (token.text === ',') {
        if (!argumentGroup.length) {
          return new UnexpectedTokenError(token, 'argument');
        }
        argumentGroups.push(argumentGroup);
        argumentGroup = [];
      } else {
        argumentGroup.push(token);
      }
    }

    // Add the last argument group.
    if (!argumentGroup.length) {
      return new IncompleteInvocationError(tokens[tokens.length - 1], 'argument');
    }
    argumentGroups.push(argumentGroup);
    return argumentGroups;
  }
}
