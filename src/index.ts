import Definition, { ArgumentRangeType } from './definition/Definition';
import SapError from './error/SapError';
import Tokenizer from './token/Tokenizer';
import StatementParser from './statement/StatementParser';
import DefinitionParser from './definition/DefinitionParser';
import Declaration from './definition/Declaration';
import Token from './token/Token';
import SapType from './type/SapType';
import BlockType from './type/BlockType';
import SapFloat from './type/SapFloat';
import Side from './type/Side';
import Axis from './type/Axis';
import SapInteger from './type/SapInteger';
import SapBoolean from './type/SapBoolean';
import ReturnStatement from './invocation/ReturnStatement';
export { default as Transpiler } from './transpiler/Transpiler';
export { default as TranspilerInverse } from './transpilerInverse/TranspilerInverse';

export interface ShapeAssemblyProgram {
  definitions: Definition[];
  errors: SapError[];
  lineBreaks: number[];
  tokens: Token[];
}

export default class ShapeAssemblyParser {
  private tokenizer: Tokenizer = new Tokenizer();
  private statementParser: StatementParser = new StatementParser();
  private definitionParser: DefinitionParser = new DefinitionParser();

  private makeStandardDefinition(
    name: string,
    argumentTypes: SapType<unknown>[],
    argumentRangeTypes: ArgumentRangeType[],
    returnType?: SapType<unknown>,
  ) {
    return new Definition(
      new Declaration(new Token(name, 0, 0), []),
      [],
      argumentTypes,
      true,
      false,
      false,
      returnType,
      returnType ? new ReturnStatement([new Token('', 0, 0)], new Token('', 0, 0)) : undefined,
      argumentRangeTypes.map((x) => [x]),
    );
  }

  private makeStandardDefinitions(): Definition[] {
    const attach = this.makeStandardDefinition(
      'attach',
      [
        new BlockType(),
        new BlockType(),
        new SapFloat(),
        new SapFloat(),
        new SapFloat(),
        new SapFloat(),
        new SapFloat(),
        new SapFloat(),
      ],
      [undefined, undefined, [100, 1000], 'unit', 'unit', 'unit', 'unit', 'unit'],
      undefined,
    );
    const squeeze = this.makeStandardDefinition(
      'squeeze',
      [new BlockType(), new BlockType(), new BlockType(), new Side(), new SapFloat(), new SapFloat()],
      [undefined, undefined, undefined, undefined, 'unit', 'unit'],
      undefined,
    );
    const reflect = this.makeStandardDefinition(
      'reflect',
      [new BlockType(), new Axis()],
      [undefined, undefined],
      undefined,
    );
    const translate = this.makeStandardDefinition(
      'translate',
      [new BlockType(), new Axis(), new SapInteger(), new SapFloat()],
      [undefined, undefined, [1, 10], 'unit'],
      undefined,
    );
    const cuboid = this.makeStandardDefinition(
      'Cuboid',
      [new SapFloat(), new SapFloat(), new SapFloat(), new SapBoolean()],
      ['bbox_x', 'bbox_y', 'bbox_z', undefined],
      new BlockType(),
    );
    return [attach, squeeze, reflect, translate, cuboid];
  }

  private getLineBreaks(program: string): number[] {
    const lineBreaks = [];
    for (let i = 0; i < program.length; i++) {
      if (program[i] === '\n') {
        lineBreaks.push(i);
      }
    }
    return lineBreaks;
  }

  public parseShapeAssemblyProgram(program: string, prefix?: string): ShapeAssemblyProgram {
    // Augment the standard definitions with additional prefix definitions.
    const prefixErrors: SapError[] = [];
    let definitions = this.makeStandardDefinitions();
    if (prefix) {
      const tokens = this.tokenizer.tokenize(prefix);
      const { statements, errors: statementErrors } = this.statementParser.parseStatements(tokens);
      const { result, errors: definitionErrors } = this.definitionParser.parseDefinitions(definitions, statements);
      prefixErrors.push(...statementErrors);
      prefixErrors.push(...definitionErrors);
      definitions.forEach((definition) => {
        definition.isFromPrefix = true;
      });
      definitions = result;
    }

    const tokens = this.tokenizer.tokenize(program);
    const { statements, errors: statementErrors } = this.statementParser.parseStatements(tokens);
    const { result, errors: definitionErrors } = this.definitionParser.parseDefinitions(definitions, statements);
    return {
      definitions: result,
      errors: [...statementErrors, ...definitionErrors, ...prefixErrors],
      lineBreaks: this.getLineBreaks(program),
      tokens,
    };
  }
}
