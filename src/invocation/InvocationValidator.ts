import Definition from '../definition/Definition';
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

export default class InvocationValidator {
  private nameValidator: NameValidator = new NameValidator();

  public validateInvocation(
    invocation: Invocation,
    existingDefinitions: Definition[],
    functionLocalTypes: Map<string, SapType<unknown> | null>,
  ): SapError | undefined {
    // Validate that a corresponding definition exists.
    const definition = existingDefinitions.find((d) => d.declaration.nameToken.text === invocation.definitionToken.text);
    if (!definition) {
      return new InvocationError(invocation.definitionToken);
    }

    // Validate assignment.
    if (invocation.assignmentToken) {
      // Validate that assignment is expected.
      if (!definition.returnType) {
        return new UnexpectedAssignmentError(invocation.definitionToken);
      }

      // Check collisions with definition names and function-local variable names.
      const variableConflict = functionLocalTypes.get(invocation.assignmentToken.text) !== undefined;
      const definitionConflict = existingDefinitions.find((d) => d.declaration.nameToken.text === invocation.assignmentToken?.text);
      if (variableConflict || definitionConflict) {
        return new AlreadyDeclaredError(invocation.assignmentToken);
      }

      // Add the assignment to the known local types.
      functionLocalTypes.set(invocation.assignmentToken.text, definition.returnType);
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
      const leaves = this.getLeaves(invocation.argumentExpressions[i]);
      const expectedType = definition.argumentTypes[i];

      for (const leaf of leaves) {
        // Check if the leaf is a variable.
        if (this.nameValidator.isValidName(leaf.token.text)) {
          const existingType = functionLocalTypes.get(leaf.token.text);
          if (existingType === undefined) {
            return new NotDeclaredError(leaf.token);
          } else if (existingType === null) {
            functionLocalTypes.set(leaf.token.text, expectedType);
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
    }
    return undefined;
  }

  private getLeaves(node: ExpressionNode): ExpressionNode[] {
    if (node.children.length === 0) {
      return [node];
    } else {
      return node.children.reduce((nodes: ExpressionNode[], child) => [...nodes, ...this.getLeaves(child)], []);
    }
  }
}
