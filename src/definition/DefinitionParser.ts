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
import SapTypeError from '../error/SapTypeError';
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
    const errors: SapError[] = [];
    const definitions = existingDefinitions;
    const chunks = this.splitter.splitIntoDefinitions(statements);

    chunks.forEach((chunk) => {
      // Create an error if there's no function body.
      if (chunk.length === 1) {
        const tokens = chunk[0].tokens;
        errors.push(new DeclarationBodyError(tokens[tokens.length - 1]));
      }

      // Parse the function's statements.
      const typeMap = new Map<string, SapType<unknown>>();
      let declaration: Declaration | undefined = undefined;
      const invocations: Invocation[] = [];
      const failure = chunk.some((statement, index) => {
        if (index) {
          // Parse an invocation.
          const invocation = this.invocationParser.parseInvocation(statement);
          if (invocation instanceof SapError) {
            errors.push(invocation);
          } else {
            // Validate the invocation.
            if (!declaration) {
              throw new Error('declaration must be defined to parse invocations');
            }
            const validationResult = this.invocationValidator.validateInvocation(invocation, definitions, invocations);
            if (validationResult instanceof SapError) {
              errors.push(validationResult);
            } else {
              // Validate types.
              for (const [tokenText, type] of Array.from(validationResult.entries())) {
                const existingType = typeMap.get(tokenText);
                if (existingType && type.name !== existingType.name) {
                  return new SapTypeError(statement.tokens[0], existingType);
                }
                typeMap.set(tokenText, type);
              }
              invocations.push(invocation);
            }
          }
        } else {
          // If the declaration is invalid, the definition becomes invalid.
          const possibleDeclaration = this.declarationParser.parseDeclaration(statement);
          if (possibleDeclaration instanceof SapError) {
            errors.push(possibleDeclaration);
            return true;
          } else {
            declaration = possibleDeclaration;
          }
        }
        return false;
      });
      if (!failure && declaration) {
        definitions.push(this.makeCustomDefinition(declaration, invocations, typeMap));
      }
    });

    return { result: definitions, errors };
  }

  private makeCustomDefinition(declaration: Declaration, invocations: Invocation[], typeMap: Map<string, SapType<unknown>>): Definition {
    const types = declaration.parameterTokens.map((token) => typeMap.get(token.text) ?? new UnknownType());
    return new Definition(declaration, invocations, types, false, undefined);
  }
}
