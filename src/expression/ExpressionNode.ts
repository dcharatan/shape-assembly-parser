import Token from '../token/Token';
import SapType from '../type/SapType';
import SapError from '../error/SapError';
import NameValidator from '../name/NameValidator';
import UnexpectedTokenError from '../error/UnexpectedTokenError';

interface TokenJSON {
  start: number;
  end: number;
  text: string;
}

export interface ExpressionNodeJSON {
  token: TokenJSON;
  children: ExpressionNodeJSON[];
}

export default class ExpressionNode {
  private static nameValidator = new NameValidator();
  constructor(public readonly token: Token, public readonly children: ExpressionNode[]) {}

  public evaluate<T>(as: SapType<T>, variableValues: Map<string, T>): T | SapError {
    if (this.children.length > 0) {
      const values = this.children.map((child) => child.evaluate(as, variableValues));
      const error = values.find((value) => value instanceof SapError);
      if (error) {
        return error;
      }
      return as.evaluate(values as T[], this.token);
    }
    if (ExpressionNode.nameValidator.isValidName(this.token.text)) {
      return variableValues.get(this.token.text) ?? new UnexpectedTokenError(this.token, 'defined variable');
    }
    return as.parse(this.token);
  }

  public substitute(substitutions: Map<string, ExpressionNode>): ExpressionNode {
    // Replace this node with a substitution if one exists.
    const substitution = substitutions.get(this.token.text);
    if (substitution) {
      return substitution;
    }

    // Run substitution on all children.
    // Don't modify the original expression tree.
    return new ExpressionNode(
      this.token,
      this.children.map((child) => child.substitute(substitutions)),
    );
  }

  public toJSON(): ExpressionNodeJSON {
    const children = this.children.map((child) => child.toJSON());
    const { text, start, end } = this.token;
    return {
      token: { text, start, end },
      children,
    };
  }
}
