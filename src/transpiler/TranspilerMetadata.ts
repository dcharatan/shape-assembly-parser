import { ShapeAssemblyProgram } from '..';
import Definition from '../definition/Definition';
import Token, { TokenJSON } from '../token/Token';
import BlockType from '../type/BlockType';
import characterIndexToLineIndex from './characterIndexToLineIndex';
import PlaceholderLine from './PlaceholderLine';

type TokenKey = string;
const tokenToKey = (token: Token | TokenJSON) => `${token.start}/${token.end}`;

export default class TranspilerMetadata {
  // This maps Python line indices to transpiled line indices.
  // It only maps the line itself, not its descendants.
  public invocationLineMap: Map<number, number[]> = new Map();

  // This maps Python line indices to transpiled descendant line indices.
  // It does not map the line itself.
  public invocationDescendantLineMap: Map<number, number[]> = new Map();

  // This maps Python definition line indices to Python invocation line indices.
  // In other words, it maps function definition lines to function bodies.
  public definitionContentsMap: Map<number, number[]> = new Map();

  // This maps definition name token keys to Python line numbers.
  // This also maps cuboid token keys to Python line numbers.
  // This also maps invocation function name keys to Python line numbers.
  public tokenLineMap: Map<TokenKey, number> = new Map();

  // This maps cuboid usage token keys to cuboid assignment tokens.
  public cuboidUsageMap: Map<TokenKey, TokenJSON> = new Map();

  // These combine tokenLineMap and invocationLineMap/invocationDescendantLineMap.
  public tokenToDirectLines: Map<TokenKey, number[]> = new Map();
  public tokenToDescendantLines: Map<TokenKey, number[]> = new Map();

  public constructor(
    program: ShapeAssemblyProgram,
    assemblies: PlaceholderLine[][],
    lineMap: Map<number, PlaceholderLine[]>,
    descendantLineMap: Map<number, PlaceholderLine[]>,
  ) {
    this.fillInvocationLineMap(assemblies, lineMap, descendantLineMap);
    this.fillDefinitionContentsMap(program);
    this.fillTokenLineMap(program);
    this.fillCuboidUsageMap(program);
    this.fillConvenienceMaps();
  }

  private fillConvenienceMaps() {
    this.tokenLineMap.forEach((line, tokenKey) => {
      // Using the cuboidUsageMap, find the original assignment.
      const originalToken = this.cuboidUsageMap.get(tokenKey);
      if (originalToken) {
        // This is a cuboid that was originally assigned elsewhere.
        // Get the original assignment's line.
        const originalTokenKey = tokenToKey(originalToken);
        const originalLine = this.tokenLineMap.get(originalTokenKey);
        if (originalLine === undefined) {
          console.error(originalToken);
          throw Error("Line for original assignment's token not found.");
        }

        // Use the original token and line.
        this.tokenToDirectLines.set(tokenKey, this.tokenToDirectLines.get(originalTokenKey) ?? []);
        this.tokenToDescendantLines.set(tokenKey, this.tokenToDescendantLines.get(originalTokenKey) ?? []);
        this.tokenToDirectLines.get(tokenKey)?.push(...(this.invocationLineMap.get(originalLine) ?? []));
        this.tokenToDescendantLines.get(tokenKey)?.push(...(this.invocationDescendantLineMap.get(originalLine) ?? []));
      } else {
        // There's no cuboid mapping. Just use the direct (old) approach.
        // Make the arrays if they're not already there.
        this.tokenToDirectLines.set(tokenKey, this.tokenToDirectLines.get(tokenKey) ?? []);
        this.tokenToDescendantLines.set(tokenKey, this.tokenToDescendantLines.get(tokenKey) ?? []);
        this.tokenToDirectLines.get(tokenKey)?.push(...(this.invocationLineMap.get(line) ?? []));
        this.tokenToDescendantLines.get(tokenKey)?.push(...(this.invocationDescendantLineMap.get(line) ?? []));
      }
    });
  }

  private fillCuboidUsageMap(program: ShapeAssemblyProgram) {
    // This maps definition names to definition-specific assignment maps.
    // An assignment map maps each cuboid variable to the assignment token of the cuboid command that created it.
    const globalAssignmentMap = new Map<string, Map<string, TokenJSON>>();
    const definitionMap = new Map<string, Definition>();

    program.definitions.forEach((definition) => {
      const assignmentMap = new Map<string, TokenJSON>();
      definitionMap.set(definition.declaration.nameToken.text, definition);

      // Map tokens to where they were assigned (as arguments).
      definition.declaration.parameterTokens.forEach((token) => assignmentMap.set(token.text, token.toJson()));

      // Map cuboid usages in invocations.
      definition.invocations.forEach((invocation) => {
        if (invocation.definitionToken.text === 'Cuboid') {
          // The assignment is from a cuboid command, so it's creating cuboids.
          invocation.assignmentTokens.forEach((assignmentToken) =>
            assignmentMap.set(assignmentToken.text, assignmentToken.toJson()),
          );
        } else {
          // The assignment is from a function/abstraction.
          // We need to find the function's assignmentMap and read from it.
          const functionAssignmentMap = globalAssignmentMap.get(invocation.definitionToken.text);
          if (!functionAssignmentMap) {
            throw new Error('Could not find assignment map for function definition.');
          }
          invocation.assignmentTokens.forEach((assignmentToken, index) => {
            // Figure out what the token is called at assignment.
            const invocationDefinition = definitionMap.get(invocation.definitionToken.text);
            if (!invocationDefinition) {
              throw new Error('Could not find definition for invocation.');
            }
            const nameAtSourceToken = invocationDefinition.returnStatement?.tokens[index];
            if (!nameAtSourceToken) {
              throw new Error("Could not find assignment's name at source definition.");
            }

            // Get the original assignment token using the token's name in the invocation's definition.
            const token = functionAssignmentMap.get(nameAtSourceToken.text);
            if (token) {
              this.cuboidUsageMap.set(tokenToKey(assignmentToken), token);
              assignmentMap.set(assignmentToken.text, token);
            } else {
              throw new Error('Could not find original assignment for function/abstraction assignment.');
            }
          });
        }
        invocation.argumentExpressions.forEach((expression, index) => {
          if (invocation.argumentTypes[index] instanceof BlockType) {
            const token = assignmentMap.get(expression.token.text);
            if (token) {
              this.cuboidUsageMap.set(tokenToKey(expression.token), token);
            } else {
              throw new Error('Could not find assignment.');
            }
          }
        });
      });

      // Map cuboid usage in the return.
      if (definition.returnStatement && !definition.isBuiltIn) {
        definition.returnStatement.tokens.forEach((token) => {
          const assignmentToken = assignmentMap.get(token.text);
          if (!assignmentToken) {
            throw new Error('Returned unknown value.');
          }
          this.cuboidUsageMap.set(tokenToKey(token), assignmentToken);
        });
      }

      globalAssignmentMap.set(definition.declaration.nameToken.text, assignmentMap);
    });
  }

  private fillTokenLineMap(program: ShapeAssemblyProgram) {
    program.tokens.forEach((token) =>
      this.tokenLineMap.set(tokenToKey(token), characterIndexToLineIndex(token.start, program.lineBreaks)),
    );
  }

  private fillInvocationLineMap(
    assemblies: PlaceholderLine[][],
    lineMap: Map<number, PlaceholderLine[]>,
    descendantLineMap: Map<number, PlaceholderLine[]>,
  ) {
    // Map placeholder lines to their indices.
    let index = 0;
    const lineToIndex = new Map<PlaceholderLine, number>();
    assemblies.forEach((assembly) => {
      assembly.forEach((line) => {
        lineToIndex.set(line, index);
        index++;
      });
    });

    const applyLineMap = (from: Map<number, PlaceholderLine[]>, to: Map<number, number[]>) => {
      for (const [lineIndex, placeholderLines] of from.entries()) {
        const transpiledLineIndices: number[] = [];
        placeholderLines.forEach((line) => {
          const transpiledIndex = lineToIndex.get(line);
          if (transpiledIndex) {
            transpiledLineIndices.push(transpiledIndex);
          }
        });
        to.set(lineIndex, transpiledLineIndices);
      }
    };

    // Set invocationLineMap by converting lineMap.
    applyLineMap(lineMap, this.invocationLineMap);
    applyLineMap(descendantLineMap, this.invocationDescendantLineMap);
  }

  private fillDefinitionContentsMap(program: ShapeAssemblyProgram) {
    program.definitions.forEach((definition) => {
      const definitionLineNumber = characterIndexToLineIndex(
        definition.declaration.nameToken.start,
        program.lineBreaks,
      );
      definition.invocations.forEach((invocation) => {
        const invocationLineNumber = characterIndexToLineIndex(invocation.definitionToken.start, program.lineBreaks);
        if (!this.definitionContentsMap.has(definitionLineNumber)) {
          this.definitionContentsMap.set(definitionLineNumber, []);
        }
        this.definitionContentsMap.get(definitionLineNumber)?.push(invocationLineNumber);
      });
    });
  }
}
