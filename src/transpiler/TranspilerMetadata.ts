import { ShapeAssemblyProgram } from '..';
import ExpressionNode from '../expression/ExpressionNode';
import Token, { TokenJSON } from '../token/Token';
import characterIndexToLineIndex from './characterIndexToLineIndex';
import PlaceholderLine from './PlaceholderLine';

type TokenKey = string;
const tokenToKey = (token: Token) => `${token.start}/${token.end}`;

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
      // Make the arrays if they're not already there.
      this.tokenToDirectLines.set(tokenKey, this.tokenToDirectLines.get(tokenKey) ?? []);
      this.tokenToDescendantLines.set(tokenKey, this.tokenToDescendantLines.get(tokenKey) ?? []);
      this.tokenToDirectLines.get(tokenKey)?.push(...(this.invocationLineMap.get(line) ?? []));
      this.tokenToDescendantLines.get(tokenKey)?.push(...(this.invocationDescendantLineMap.get(line) ?? []));
    });
  }

  private fillCuboidUsageMap(program: ShapeAssemblyProgram) {
    program.definitions.forEach((definition) => {
      const assignmentMap = new Map<string, TokenJSON>();

      // Map tokens to where they were assigned (as arguments).
      definition.declaration.parameterTokens.forEach((token) => assignmentMap.set(token.text, token.toJson()));

      // Map tokens to where they were assigned (via assignment).
      const mapTokens = (expression: ExpressionNode) => {
        const token = assignmentMap.get(expression.token.text);
        if (token) {
          this.cuboidUsageMap.set(tokenToKey(expression.token), token);
        }
        expression.token.text;
        expression.children.forEach(mapTokens);
      };

      definition.invocations.forEach((invocation) => {
        invocation.assignmentTokens.forEach((assignmentToken) =>
          assignmentMap.set(assignmentToken.text, assignmentToken.toJson()),
        );
        invocation.argumentExpressions.forEach(mapTokens);
      });
    });
  }

  private fillTokenLineMap(program: ShapeAssemblyProgram) {
    program.tokens.forEach((token) => this.tokenLineMap.set(tokenToKey(token), characterIndexToLineIndex(token.start, program.lineBreaks)));
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
