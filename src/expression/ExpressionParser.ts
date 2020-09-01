import Token from '../token/Token';
import Operator from '../operator/Operator';
import {
  operatorSymbols,
  unaryOperatorSymbolsToOperators,
  binaryOperatorSymbolsToOperators,
} from '../operator/operators';
import InvalidOperatorError from '../error/InvalidOperatorError';
import SapError from '../error/SapError';
import ExpressionNode from './ExpressionNode';
import UnexpectedTokenError from '../error/UnexpectedTokenError';

export default class ExpressionParser {
  parseExpression(tokens: Token[]): ExpressionNode | SapError {
    // Map tokens to operators.
    const tokensToOperators = this.mapTokensToOperators(tokens);
    if (tokensToOperators instanceof SapError) {
      return tokensToOperators;
    }

    // Validate the absence of consecutive non-operators.
    const error = this.validateExpression(tokens, tokensToOperators);
    if (error) {
      return error;
    }

    // Run the shunting yard algorithm.
    return this.shuntingYard(tokens, tokensToOperators);
  }

  private shuntingYard(tokens: Token[], tokensToOperators: Map<Token, Operator>) {
    const operators: Token[] = [];
    const operands: ExpressionNode[] = [];

    const addNode = (operatorToken: Token): SapError | undefined => {
      // Return an error if the operator is a parenthesis.
      const operator = tokensToOperators.get(operatorToken);
      if (!operator) {
        return new UnexpectedTokenError(operatorToken, 'operator');
      }

      // Get the left operand.
      const left = operands.pop();
      if (!left) {
        return new UnexpectedTokenError(operatorToken, 'valid expression');
      }

      // Get the right operand.
      if (operator.isUnary) {
        operands.push(new ExpressionNode(operatorToken, [left]));
      } else {
        const right = operands.pop();
        if (!right) {
          return new UnexpectedTokenError(operatorToken, 'valid expression');
        }
        operands.push(new ExpressionNode(operatorToken, [left, right]));
      }
      return undefined;
    };

    for (const token of tokens) {
      const operator = tokensToOperators.get(token);

      // Push opening parenthesis to the operator stack.
      if (token.text === '(') {
        operators.push(token);
      }

      // Pop to the opening parenthesis for closing parenthesis.
      else if (token.text === ')') {
        let foundOpeningParenthesis = false;
        while (operators.length) {
          const operator = operators.pop() as Token;
          if (operator.text === '(') {
            foundOpeningParenthesis = true;
            break;
          } else {
            const error = addNode(operator);
            if (error) {
              return error;
            }
          }
        }
        if (!foundOpeningParenthesis) {
          return new UnexpectedTokenError(token, 'matching parentheses');
        }
      }

      // Pop all higher priority operators for operators.
      else if (operator) {
        while (operators.length) {
          const topOperatorToken = operators[operators.length - 1];
          const topOperator = tokensToOperators.get(topOperatorToken);
          if (topOperator && topOperator.priority > operator.priority) {
            operators.pop();
            const error = addNode(topOperatorToken);
            if (error) {
              return error;
            }
          } else {
            break;
          }
        }
        operators.push(token);
      }

      // Push operand.
      else {
        operands.push(new ExpressionNode(token, []));
      }
    }

    while (operators.length) {
      const error = addNode(operators.pop() as Token);
      if (error) {
        return error;
      }
    }
    if (operands.length !== 1) {
      return new UnexpectedTokenError(tokens[tokens.length - 1], 'valid expression');
    }
    return operands[0];
  }

  private mapTokensToOperators(tokens: Token[]): Map<Token, Operator> | SapError {
    const tokenToOperator = new Map<Token, Operator>();
    let nextOperatorIsUnary = true;
    for (const token of tokens) {
      // If the token is an operator, add it.
      if (operatorSymbols.has(token.text)) {
        const map = nextOperatorIsUnary ? unaryOperatorSymbolsToOperators : binaryOperatorSymbolsToOperators;
        const operator = map.get(token.text);
        if (!operator) {
          return new InvalidOperatorError(token, nextOperatorIsUnary ? 'unary' : 'binary');
        }
        tokenToOperator.set(token, operator);
        nextOperatorIsUnary = true;
        continue;
      }
      nextOperatorIsUnary = token.text === '(';
    }
    return tokenToOperator;
  }

  private validateExpression(tokens: Token[], tokensToOperators: Map<Token, Operator>): SapError | undefined {
    enum TokenType {
      START,
      UNARY_OPERATOR,
      BINARY_OPERATOR,
      VALUE,
      OPENING_PARENTHESIS,
      CLOSING_PARENTHESIS,
    }

    let previousTokenType: TokenType = TokenType.START;
    let parenthesisLevel = 0;
    for (const token of tokens) {
      // Find the token type.
      let currentTokenType: TokenType = TokenType.VALUE;
      const operator = tokensToOperators.get(token);
      if (operator) {
        currentTokenType = operator.isUnary ? TokenType.UNARY_OPERATOR : TokenType.BINARY_OPERATOR;
      } else if (token.text === '(') {
        currentTokenType = TokenType.OPENING_PARENTHESIS;
        parenthesisLevel++;
      } else if (token.text === ')') {
        currentTokenType = TokenType.CLOSING_PARENTHESIS;
        parenthesisLevel--;
        if (parenthesisLevel < 0) {
          return new UnexpectedTokenError(token, 'valid expression (found too many closing parentheses)');
        }
      }

      // Return errors based on invalid sequences.
      if (
        [TokenType.START, TokenType.UNARY_OPERATOR, TokenType.BINARY_OPERATOR, TokenType.OPENING_PARENTHESIS].includes(
          previousTokenType,
        )
      ) {
        if ([TokenType.BINARY_OPERATOR, TokenType.CLOSING_PARENTHESIS].includes(currentTokenType)) {
          return new UnexpectedTokenError(token, 'value, unary operator or opening parenthesis');
        }
      } else if (
        [TokenType.UNARY_OPERATOR, TokenType.VALUE, TokenType.OPENING_PARENTHESIS].includes(currentTokenType)
      ) {
        return new UnexpectedTokenError(token, 'binary operator or closing parenthesis');
      }

      // Update the previous token type.
      previousTokenType = currentTokenType;
    }
    return undefined;
  }
}
