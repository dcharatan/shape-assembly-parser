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
import BlockType from '../type/BlockType';
import UnknownType from '../type/UnknownType';

export default class DefinitionParser {
  private splitter: DefinitionSplitter = new DefinitionSplitter();
  private declarationParser: DeclarationParser = new DeclarationParser();
  private invocationParser: InvocationParser = new InvocationParser();
  private invocationValidator: InvocationValidator = new InvocationValidator();

  public parseDefinitions(
    existingDefinitions: Definition[],
    statements: Statement[],
  ): { definitions: Definition[]; errors: SapError[] } {
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
            const validationResult = this.invocationValidator.validateInvocation(invocation, definitions, invocations);
            if (validationResult instanceof SapError) {
              errors.push(validationResult);
            } else {
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
        definitions.push(this.makeCustomDefinition(declaration, invocations));
      }
    });

    return { definitions, errors };
  }

  private makeCustomDefinition(declaration: Declaration, invocations: Invocation[]): Definition {
    const types = declaration.parameterTokens.map(() => new UnknownType());
    return new Definition(declaration, invocations, types, new BlockType());
  }
}
