import { ShapeAssemblyProgram } from '..';
import ExpressionNode from '../expression/ExpressionNode';
import { TokenJSON } from '../token/Token';
import characterIndexToLineIndex from './characterIndexToLineIndex';
import PlaceholderLine from './PlaceholderLine';

export default class TranspilerMetadata {
  // This maps Python line indices to transpiled line indices.
  public invocationLineMap: Map<number, number[]> = new Map();

  // This maps Python definition line indices to Python invocation line indices.
  // In other words, it maps function definition lines to function bodies.
  public definitionContentsMap: Map<number, number[]> = new Map();

  // This maps definition name token start indices to Python line numbers.
  // This also maps cuboid token start indices to Python line numbers.
  public tokenLineMap: Map<number, number> = new Map();

  // This maps cuboid usage token start indices to cuboid assignment tokens.
  public cuboidUsageMap: Map<number, TokenJSON> = new Map();

  public constructor(program: ShapeAssemblyProgram, assemblies: PlaceholderLine[][], lineMap: Map<number, PlaceholderLine[]>) {
    this.fillInvocationLineMap(assemblies, lineMap);
    this.fillDefinitionContentsMap(program);
    this.fillTokenLineMap(program);
    this.fillCuboidUsageMap(program);
  }

  private fillCuboidUsageMap(program: ShapeAssemblyProgram) {
    program.definitions.forEach((definition) => {
      const assignmentMap = new Map<String, TokenJSON>();

      // Map tokens to where they were assigned.
      const mapTokens = (expression: ExpressionNode) => {
        const token = assignmentMap.get(expression.token.text);
        if (token) {
          this.cuboidUsageMap.set(expression.token.start, token);
        }
        expression.token.text
        expression.children.forEach(mapTokens);
      }

      definition.invocations.forEach((invocation) => {
        invocation.assignmentTokens.forEach((assignmentToken) => assignmentMap.set(assignmentToken.text, assignmentToken.toJson()));
        invocation.argumentExpressions.forEach(mapTokens);
      });
    });
  }

  private fillTokenLineMap(program: ShapeAssemblyProgram) {
    program.definitions.forEach((definition) => {
      this.tokenLineMap.set(
        definition.declaration.nameToken.start,
        characterIndexToLineIndex(definition.declaration.nameToken.start, program.lineBreaks)
      );
      definition.invocations.forEach((invocation) => {
        const lineNumber = characterIndexToLineIndex(invocation.definitionToken.start, program.lineBreaks);
        invocation.assignmentTokens.forEach((assignmentToken) => {
          this.tokenLineMap.set(assignmentToken.start, lineNumber);
        });
      });
    });
  }

  private fillInvocationLineMap(assemblies: PlaceholderLine[][], lineMap: Map<number, PlaceholderLine[]>) {
    // Map placeholder lines to their indices.
    let index = 0;
    const lineToIndex = new Map<PlaceholderLine, number>();
    assemblies.forEach((assembly) => {
      assembly.forEach((line) => {
        lineToIndex.set(line, index);
        index++;
      });
    });

    // Set invocationLineMap by converting lineMap.
    for (const [lineIndex, placeholderLines] of lineMap.entries()) {
      const transpiledLineIndices: number[] = [];
      placeholderLines.forEach((line) => {
        const transpiledIndex = lineToIndex.get(line);
        if (transpiledIndex) {
          transpiledLineIndices.push(transpiledIndex);
        }
      });
      this.invocationLineMap.set(lineIndex, transpiledLineIndices);
    }
  }

  private fillDefinitionContentsMap(program: ShapeAssemblyProgram) {
    program.definitions.forEach((definition) => {
      const definitionLineNumber = characterIndexToLineIndex(definition.declaration.nameToken.start, program.lineBreaks);
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