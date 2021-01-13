import { TokenJSON } from '../token/Token';
import PlaceholderLine from './PlaceholderLine';

export default class TranspilerMetadata {
  // This maps Python line indices to transpiled line indices.
  public invocationLineMap: Map<number, number[]> = new Map();

  // This maps Python definition line indices to Python invocation line indices.
  // In other words, it maps function definition lines to function bodies.
  public definitionContentsMap: Map<number, number[]> = new Map();

  // This maps definition name token start indices to Python line numbers.
  public definitionLineMap: Map<number, number> = new Map();

  // This maps cuboid token start indices to Python line numbers.
  public cuboidMap: Map<number, number> = new Map();

  // This maps cuboid usage token start indices to cuboid assignment tokens.
  public tokenMap: Map<number, TokenJSON> = new Map();

  public applyLineMap(assemblies: PlaceholderLine[][], lineMap: Map<number, PlaceholderLine[]>) {
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
}