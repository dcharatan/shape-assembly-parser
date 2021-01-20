import Definition, { ArgumentRangeType } from '../definition/Definition';
import Invocation from './Invocation';
import SapError from '../error/SapError';
import InvocationError from '../error/InvocationError';
import AlreadyDeclaredError from '../error/AlreadyDeclaredError';
import UnexpectedAssignmentError from '../error/UnexpectedAssignmentError';
import ArgumentMismatchError from '../error/ArgumentMismatchError';
import ExpressionNode from '../expression/ExpressionNode';
import SapType from '../type/SapType';
import NameValidator from '../name/NameValidator';
import SapTypeError from '../error/SapTypeError';
import NotDeclaredError from '../error/NotDeclaredError';
import OperatorMismatchError from '../error/OperatorMismatchError';
import ReturnStatement from './ReturnStatement';
import BlockType from '../type/BlockType';
import ReturnTypeError from '../error/ReturnTypeError';
import UnexpectedTokenError from '../error/UnexpectedTokenError';
import UnexpectedAssignmentCountError from '../error/UnexpectedAssignmentCountError';
import SapFloat from '../type/SapFloat';
import MappedSet from '../MappedSet';

export default class InvocationValidator {
  private nameValidator: NameValidator = new NameValidator();

  public validateInvocation(
    invocation: Invocation,
    existingDefinitions: Definition[],
    functionLocalTypes: Map<string, SapType<unknown> | null>,
    argumentRangeTypes: MappedSet<string, ArgumentRangeType>,
  ): SapError | undefined {
    // Validate that a corresponding definition exists.
    const definition = existingDefinitions.find(
      (d) => d.declaration.nameToken.text === invocation.definitionToken.text,
    );
    if (!definition) {
      return new InvocationError(invocation.definitionToken);
    }

    // Validate assignment.
    for (const assignmentToken of invocation.assignmentTokens) {
      // Validate that assignment is expected.
      if (!definition.returnType) {
        return new UnexpectedAssignmentError(invocation.definitionToken);
      }

      // Check collisions with definition names and function-local variable names.
      const variableConflict = functionLocalTypes.get(assignmentToken.text) !== undefined;
      const definitionConflict = existingDefinitions.find(
        (d) => d.declaration.nameToken.text === assignmentToken?.text,
      );
      if (variableConflict || definitionConflict) {
        return new AlreadyDeclaredError(assignmentToken);
      }

      // Add the assignment to the known local types.
      functionLocalTypes.set(assignmentToken.text, definition.returnType);
    }

    // Validate assignment count.
    if (invocation.assignmentTokens.length !== (definition.returnStatement?.tokens.length ?? 0)) {
      return new UnexpectedAssignmentCountError(
        invocation.definitionToken,
        definition.returnStatement?.tokens.length ?? 0,
        invocation.assignmentTokens.length,
      );
    }

    // Validate the argument count.
    if (definition.argumentTypes.length !== invocation.argumentExpressions.length) {
      return new ArgumentMismatchError(
        invocation.definitionToken,
        definition.argumentTypes.length,
        invocation.argumentExpressions.length,
      );
    }

    // Validate the arguments.
    for (let i = 0; i < invocation.argumentExpressions.length; i++) {
      const { leaves, operators } = this.getLeavesAndOperators(invocation.argumentExpressions[i]);
      const expectedType = definition.argumentTypes[i];

      for (const leaf of leaves) {
        // Check if the leaf is a variable.
        if (this.nameValidator.isValidName(leaf.token.text)) {
          const existingType = functionLocalTypes.get(leaf.token.text);
          if (existingType === undefined) {
            return new NotDeclaredError(leaf.token);
          } else if (existingType === null) {
            functionLocalTypes.set(leaf.token.text, expectedType);
            if (expectedType instanceof SapFloat) {
              argumentRangeTypes.add(leaf.token.text, ...definition.argumentRangeTypes[i]);
            }
          } else if (existingType.name !== expectedType.name) {
            return new SapTypeError(leaf.token, expectedType);
          }
          continue;
        }

        // Try to parse the leaf.
        try {
          const parsedLeaf = expectedType.parse(leaf.token);
          if (parsedLeaf instanceof SapError) {
            return parsedLeaf;
          }
        } catch (e) {
          return new SapTypeError(leaf.token, expectedType);
        }
      }

      for (const operator of operators) {
        // Check if the operator is valid for the expected type.
        if (!expectedType.validOperators.has(operator.token.text)) {
          return new OperatorMismatchError(operator.token, expectedType);
        }
      }
    }
    invocation.argumentTypes = definition.argumentTypes;
    return undefined;
  }

  public validateReturnStatement(
    returnStatement: ReturnStatement,
    functionLocalTypes: Map<string, SapType<unknown> | null>,
  ): SapError[] | undefined {
    const errors: SapError[] = [];
    const seen = new Set<string>();
    for (const token of returnStatement.tokens) {
      // Validate the returned block's type.
      if (!(functionLocalTypes.get(token.text) instanceof BlockType)) {
        errors.push(new ReturnTypeError(token));
      }

      // Guard against duplicates.
      if (seen.has(token.text)) {
        errors.push(new UnexpectedTokenError(token, 'a cuboid that was not previously returned'));
      }
      seen.add(token.text);
    }
    return errors.length ? errors : undefined;
  }

  private getLeavesAndOperators(node: ExpressionNode): { leaves: ExpressionNode[]; operators: ExpressionNode[] } {
    if (node.children.length === 0) {
      return { leaves: [node], operators: [] };
    } else {
      const leaves: ExpressionNode[] = [];
      const operators: ExpressionNode[] = [node];
      for (const child of node.children) {
        const result = this.getLeavesAndOperators(child);
        leaves.push(...result.leaves);
        operators.push(...result.operators);
      }
      return { leaves, operators };
    }
  }
}
