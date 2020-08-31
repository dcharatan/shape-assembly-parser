import Definition from '../definition/Definition';
import Invocation from './Invocation';
import SapError from '../error/SapError';
import InvocationError from '../error/InvocationError';
import AlreadyDeclaredError from '../error/AlreadyDeclaredError';
import UnexpectedAssignmentError from '../error/UnexpectedAssignmentError';
import ArgumentMismatchError from '../error/ArgumentMismatchError';

export default class InvocationValidator {
  public validateInvocation(
    invocation: Invocation,
    definitions: Definition[],
    previousInvocations: Invocation[],
  ): SapError | undefined {
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
    if (definition.argumentTypes.length !== invocation.argumentTokens.length) {
      return new ArgumentMismatchError(
        invocation.definitionToken,
        definition.argumentTypes.length,
        invocation.argumentTokens.length,
      );
    }

    // Validate the arguments.
    for (let i = 0; i < invocation.argumentTokens.length; i++) {
      const argumentTokens = invocation.argumentTokens[i];
      const argumentType = definition.argumentTypes[i];
      const parsed = argumentType.parse(argumentTokens, previousInvocations);
      if (parsed instanceof SapError) {
        return parsed;
      }
    }
    return undefined;
  }
}
