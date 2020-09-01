import Statement from '../statement/Statement';
import Definition from './Definition';
import DefinitionSplitter from './DefinitionSplitter';
import SapError from '../error/SapError';
import DeclarationParser from './DeclarationParser';
import DeclarationBodyError from '../error/DeclarationBodyError';
import InvocationParser from '../invocation/InvocationParser';
import InvocationValidator from '../invocation/InvocationValidator';
import Invocation from '../invocation/Invocation';
import Declaration from './Declaration';
import UnknownType from '../type/UnknownType';
import SapType from '../type/SapType';
import WithErrors from '../error/WithErrors';

export default class DefinitionParser {
  private splitter: DefinitionSplitter = new DefinitionSplitter();
  private declarationParser: DeclarationParser = new DeclarationParser();
  private invocationParser: InvocationParser = new InvocationParser();
  private invocationValidator: InvocationValidator = new InvocationValidator();

  public parseDefinitions(
    existingDefinitions: Definition[],
    statements: Statement[],
  ): WithErrors<Definition[]> {
    // Split the statements into chunks.
    const chunks = this.splitter.splitIntoDefinitions(statements);

    // Collect definitions and errors.
    const collectedErrors: SapError[] = [];
    const definitions = existingDefinitions;
    for (const chunk of chunks) {
      const { result, errors } = this.parseDefinition(chunk, existingDefinitions);
      collectedErrors.push(...errors);
      if (result) {
        definitions.push(result);
      }
    }
    return { result: definitions, errors: collectedErrors };
  }

  private parseDefinition(chunk: Statement[], existingDefinitions: Definition[]): WithErrors<Definition | undefined> {
    const returnValue: WithErrors<Definition | undefined> = {
      errors: [],
      result: undefined,
    };
    
    // Parse the declaration.
    const declaration = this.declarationParser.parseDeclaration(chunk[0]);
    if (declaration instanceof SapError) {
      returnValue.errors.push(declaration);
      return returnValue;
    }

    // Create an error if there's no function body.
    if (chunk.length === 1) {
      const tokens = chunk[0].tokens;
      returnValue.errors.push(new DeclarationBodyError(tokens[tokens.length - 1]));
      return returnValue;
    }

    // Create a map of known types.
    // A null entry means that the variable exists, but that the type is (yet) unknown.
    const functionLocalTypes = new Map<string, SapType<unknown> | null>();
    declaration.parameterTokens.forEach((parameterToken) => functionLocalTypes.set(parameterToken.text, null));
    const invocations: Invocation[] = [];

    // Parse the invocations.
    for (const invocationStatement of chunk.slice(1)) {
      // Parse the invocation.
      // Ensure that the invocation statement conforms to the following format:
      // variable = function_name(expression, ...)
      const invocation = this.invocationParser.parseInvocation(invocationStatement);
      if (invocation instanceof SapError) {
        returnValue.errors.push(invocation);
        continue;
      }

      // Validate the invocation.
      // Ensure that types match, variable and function names are valid, etc.
      const error = this.invocationValidator.validateInvocation(invocation, existingDefinitions, functionLocalTypes);
      if (error instanceof SapError) {
        returnValue.errors.push(error);
        return returnValue;
      }

      // The invocation is valid.
      invocations.push(invocation);
    }

    returnValue.result = this.makeCustomDefinition(declaration, invocations, functionLocalTypes);
    return returnValue;
  }

  private makeCustomDefinition(declaration: Declaration, invocations: Invocation[], typeMap: Map<string, SapType<unknown> | null>): Definition {
    const types = declaration.parameterTokens.map((token) => typeMap.get(token.text) ?? new UnknownType());
    return new Definition(declaration, invocations, types, false, undefined);
  }
}
