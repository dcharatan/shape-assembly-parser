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

export default class InvocationValidator {
  nameValidator: NameValidator = new NameValidator();

  public validateInvocation(
    invocation: Invocation,
    definitions: Definition[],
    previousInvocations: Invocation[],
  ): SapError | Map<string, SapType<unknown>> {
    // Validate that a corresponding definition exists.
    const definition = definitions.find((d) => d.declaration.nameToken.text === invocation.definitionToken.text);
    if (!definition) {
      return new InvocationError(invocation.definitionToken);
    }

    if (invocation.assignmentToken) {
      // Validate that assignment is expected.
      if (!definition.returnType) {
        return new UnexpectedAssignmentError(invocation.definitionToken);
      }

      // Validate that the assignment isn't a duplicate.
      const conflict = previousInvocations.find((i) => i.assignmentToken?.text === invocation.assignmentToken?.text);
      if (conflict) {
        return new AlreadyDeclaredError(invocation.assignmentToken);
      }
    }

    // Validate the argument count.
    if (definition.argumentTypes.length !== invocation.argumentExpressions.length) {
      return new ArgumentMismatchError(
        invocation.definitionToken,
        definition.argumentTypes.length,
        invocation.argumentExpressions.length,
      );
    }

    // Validate the arguments and map declaration arguments to inferred types.
    const typeMap = new Map<string, SapType<unknown>>();
    for (let i = 0; i < invocation.argumentExpressions.length; i++) {
      const leaves = this.getLeaves(invocation.argumentExpressions[i]);
      for (const leaf of leaves) {
        const parsedLeaf = definition.argumentTypes[i].parse(leaf.token, previousInvocations);

        // Check if the leaf is a variable.
        if (this.nameValidator.isValidName(leaf.token.text)) {
          typeMap.set(leaf.token.text, definition.argumentTypes[i]);
          continue;
        }

        // If the leaf isn't a variable, attempt to parse it.
        if (parsedLeaf instanceof SapError) {
          return parsedLeaf;
        }
      }
    }
    return typeMap;
  }

  private getLeaves(node: ExpressionNode): ExpressionNode[] {
    if (node.children.length === 0) {
      return [node];
    } else {
      return node.children.reduce((nodes: ExpressionNode[], child) => [...nodes, ...this.getLeaves(child)], []);
    }
  }
}
