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
import { ASSEMBLY_ANNOTATION_KEYWORD, ROOT_ASSEMBLY_ANNOTATION_KEYWORD } from '../annotation/annotationKeywords';
import BlockType from '../type/BlockType';
import IncompleteDefinitionError from '../error/IncompleteDefinitionError';
import Token from '../token/Token';

export default class DefinitionParser {
  private splitter: DefinitionSplitter = new DefinitionSplitter();
  private declarationParser: DeclarationParser = new DeclarationParser();
  private invocationParser: InvocationParser = new InvocationParser();
  private invocationValidator: InvocationValidator = new InvocationValidator();

  public parseDefinitions(existingDefinitions: Definition[], statements: Statement[]): WithErrors<Definition[]> {
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

    // Parse any annotations.
    let isChildAssembly = false;
    let isRootAssembly = false;
    let annotationToken: Token | undefined = undefined;
    if (chunk[0].tokens.length === 1) {
      const token = chunk[0].tokens[0];
      if (token.text === ASSEMBLY_ANNOTATION_KEYWORD) {
        isChildAssembly = true;
      } else if (token.text === ROOT_ASSEMBLY_ANNOTATION_KEYWORD) {
        isRootAssembly = true;
      }
      if (isChildAssembly || isRootAssembly) {
        chunk = chunk.splice(1);
        annotationToken = token;
      }
    }
    if (chunk.length === 0 && annotationToken) {
      returnValue.errors.push(new IncompleteDefinitionError(annotationToken));
      return returnValue;
    }

    // Parse the declaration.
    const declaration = this.declarationParser.parseDeclaration(chunk[0], isRootAssembly, isChildAssembly);
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

    // The single argument for child assemblies has a known type (cuboid for the bounding box).
    if (isChildAssembly) {
      functionLocalTypes.set(declaration.parameterTokens[0].text, new BlockType());
    }

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

    returnValue.result = this.makeCustomDefinition(
      declaration,
      invocations,
      functionLocalTypes,
      isRootAssembly,
      isChildAssembly,
    );
    return returnValue;
  }

  private makeCustomDefinition(
    declaration: Declaration,
    invocations: Invocation[],
    typeMap: Map<string, SapType<unknown> | null>,
    isRootAssembly: boolean,
    isChildAssembly: boolean,
  ): Definition {
    const types = declaration.parameterTokens.map((token) => typeMap.get(token.text) ?? new UnknownType());
    return new Definition(declaration, invocations, types, false, isRootAssembly, isChildAssembly, undefined);
  }
}
