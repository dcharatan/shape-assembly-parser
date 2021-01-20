import Statement from '../statement/Statement';
import Definition, { ArgumentRangeType } from './Definition';
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
import { CHILD_ASSEMBLY_ANNOTATION_KEYWORD, ROOT_ASSEMBLY_ANNOTATION_KEYWORD } from '../annotation/annotationKeywords';
import BlockType from '../type/BlockType';
import IncompleteDefinitionError from '../error/IncompleteDefinitionError';
import Token from '../token/Token';
import InvalidRootAssemblyError from '../error/InvalidRootAssemblyError';
import ReturnStatement from '../invocation/ReturnStatement';
import AlreadyReturnedError from '../error/AlreadyReturnedError';
import UnexpectedReturnError from '../error/UnexpectedReturnError';
import DEF_KEYWORD from './DefKeyword';
import UnexpectedTokenError from '../error/UnexpectedTokenError';
import FunctionOrderingError from '../error/FunctionOrderingError';
import MappedSet from '../MappedSet';

export default class DefinitionParser {
  private splitter: DefinitionSplitter = new DefinitionSplitter();
  private declarationParser: DeclarationParser = new DeclarationParser();
  private invocationParser: InvocationParser = new InvocationParser();
  private invocationValidator: InvocationValidator = new InvocationValidator();

  public parseDefinitions(existingDefinitions: Definition[], statements: Statement[]): WithErrors<Definition[]> {
    // Split the statements into chunks.
    const unorderedChunks = this.splitter.splitIntoDefinitions(statements);

    // Order the definitions.
    const chunks = this.orderDefinitions(unorderedChunks);
    if (chunks instanceof SapError) {
      return { result: [], errors: [chunks] };
    }

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

  private orderDefinitions(chunks: Statement[][]): Statement[][] | SapError {
    // Map function names to chunks.
    const chunkMap = new Map<string, Statement[]>();
    const reverseChunkMap = new Map<Statement[], string>();
    for (const chunk of chunks) {
      let foundDef = false;
      for (const statement of chunk) {
        for (const token of statement.tokens) {
          if (foundDef) {
            chunkMap.set(token.text, chunk);
            reverseChunkMap.set(chunk, token.text);
            break;
          } else if (token.text === DEF_KEYWORD) {
            foundDef = true;
          }
        }
        if (foundDef) {
          break;
        }
      }
      if (!foundDef) {
        return new UnexpectedTokenError(chunk[0].tokens[0], 'function name');
      }
    }

    // Map each chunk (definition) to its dependencies.
    const dependencies = new Map<string, Set<string>>();
    const dependents = new Map<string, Set<string>>();
    for (const chunk of chunks) {
      const chunkName = reverseChunkMap.get(chunk);
      if (!chunkName) {
        return new UnexpectedTokenError(chunk[0].tokens[0], 'function name');
      }
      dependencies.set(chunkName, new Set());
      dependents.set(chunkName, new Set());
    }
    for (const chunk of chunks) {
      const chunkName = reverseChunkMap.get(chunk);
      if (!chunkName) {
        console.error(chunkName);
        throw new Error('Could not find chunk name.');
      }
      for (const statement of chunk) {
        for (const token of statement.tokens) {
          const tokenText = token.text;
          if (tokenText !== chunkName && chunkMap.has(tokenText)) {
            dependencies.get(chunkName)?.add(tokenText);
            dependents.get(tokenText)?.add(chunkName);
          }
        }
      }
    }

    // Do a topsort.
    const orderedChunks: Statement[][] = [];
    const available: string[] = [];
    dependencies.forEach((chunkDependencies, chunkName) => {
      if (chunkDependencies.size === 0) {
        available.push(chunkName);
      }
    });
    while (available.length > 0) {
      const chunkName = available.pop();
      if (!chunkName) {
        throw new Error('This should literally never happen.');
      }

      // Add the chunk to the result.
      const chunk = chunkMap.get(chunkName);
      if (!chunk) {
        throw new Error('Could not find chunk for name.');
      }
      orderedChunks.push(chunk);

      // Find chunks that can be parsed next.
      const chunkDependents = dependents.get(chunkName) ?? new Set();
      for (const dependent of chunkDependents) {
        const dependentDependencies = dependencies.get(dependent);
        if (!dependentDependencies) {
          throw new Error("Could not find dependent's dependencies.");
        }
        dependentDependencies.delete(chunkName);
        if (dependentDependencies.size === 0) {
          available.push(dependent);
        }
      }
    }
    if (orderedChunks.length !== chunks.length) {
      return new FunctionOrderingError(chunks[0][0].tokens[0]);
    }
    return orderedChunks;
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
      if (token.text === CHILD_ASSEMBLY_ANNOTATION_KEYWORD) {
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

    // Initialize the argumentRangeTypes.
    // This is updated as the parameter types become known (floats become either unit or bbox-based).
    const argumentRangeTypes = new MappedSet<string, ArgumentRangeType>();

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
    let returnStatement: ReturnStatement | SapError | undefined = undefined;
    for (const invocationStatement of chunk.slice(1)) {
      // If there's another statement after a return statement, that's invalid.
      if (returnStatement) {
        returnValue.errors.push(new AlreadyReturnedError(invocationStatement.tokens[0]));
        return returnValue;
      }

      // Check if the invocation is a return statement.
      // If so, parse it separately.
      if (invocationStatement.tokens[0].text === 'return') {
        if (isRootAssembly || isChildAssembly) {
          returnValue.errors.push(new UnexpectedReturnError(invocationStatement.tokens[0]));
        }

        returnStatement = this.invocationParser.parseReturn(invocationStatement.tokens);
        if (returnStatement instanceof SapError) {
          returnValue.errors.push(returnStatement);
          return returnValue;
        }
        const errors = this.invocationValidator.validateReturnStatement(returnStatement, functionLocalTypes);
        if (Array.isArray(errors)) {
          returnValue.errors.push(...errors);
          return returnValue;
        }
        continue;
      }

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
      const error = this.invocationValidator.validateInvocation(
        invocation,
        existingDefinitions,
        functionLocalTypes,
        argumentRangeTypes,
      );
      if (error instanceof SapError) {
        returnValue.errors.push(error);
        return returnValue;
      }

      // The invocation is valid.
      invocations.push(invocation);
    }

    // Ensure that bbox is declared for the root assembly.
    if (isRootAssembly) {
      const bboxType = functionLocalTypes.get('bbox');
      if (!bboxType || bboxType.name !== new BlockType().name) {
        returnValue.errors.push(new InvalidRootAssemblyError(declaration.nameToken));
      }
    }

    returnValue.result = this.makeCustomDefinition(
      declaration,
      invocations,
      functionLocalTypes,
      isRootAssembly,
      isChildAssembly,
      returnStatement,
      declaration.parameterTokens.map((parameterToken) => [...argumentRangeTypes.get(parameterToken.text)] ?? []),
    );
    return returnValue;
  }

  private makeCustomDefinition(
    declaration: Declaration,
    invocations: Invocation[],
    typeMap: Map<string, SapType<unknown> | null>,
    isRootAssembly: boolean,
    isChildAssembly: boolean,
    returnStatement: ReturnStatement | undefined,
    argumentRangeTypes: ArgumentRangeType[][],
  ): Definition {
    const types = declaration.parameterTokens.map((token) => typeMap.get(token.text) ?? new UnknownType());
    return new Definition(
      declaration,
      invocations,
      types,
      false,
      isRootAssembly,
      isChildAssembly,
      returnStatement ? new BlockType() : undefined,
      returnStatement,
      argumentRangeTypes,
    );
  }
}
