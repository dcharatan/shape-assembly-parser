import Definition from './definition/Definition';
import SapError from './error/SapError';
import Tokenizer from './token/Tokenizer';
import StatementParser from './statement/StatementParser';
import DefinitionParser from './definition/DefinitionParser';
import Declaration from './definition/Declaration';
import Token from './token/Token';
import SapType from './type/SapType';
import BlockType from './type/BlockType';
import UnitFloat from './type/UnitFloat';
import Side from './type/Side';
import Axis from './type/Axis';
import PositiveInteger from './type/PositiveInteger';
import PositiveFloat from './type/PositiveFloat';
import SapBoolean from './type/SapBoolean';

export interface ShapeAssemblyProgram {
  definitions: Definition[];
  errors: SapError[];
}

export default class ShapeAssemblyParser {
  private tokenizer: Tokenizer = new Tokenizer();
  private statementParser: StatementParser = new StatementParser();
  private definitionParser: DefinitionParser = new DefinitionParser();

  private makeStandardDefinition(name: string, argumentTypes: SapType<unknown>[], returnType?: SapType<unknown>) {
    return new Definition(
      new Declaration(new Token(name, 0, 0), []),
      [],
      argumentTypes,
      true,
      false,
      false,
      returnType,
    );
  }

  private makeStandardDefinitions(): Definition[] {
    const attach = this.makeStandardDefinition(
      'attach',
      [
        new BlockType(),
        new BlockType(),
        new UnitFloat(),
        new UnitFloat(),
        new UnitFloat(),
        new UnitFloat(),
        new UnitFloat(),
        new UnitFloat(),
      ],
      undefined,
    );
    const squeeze = this.makeStandardDefinition(
      'squeeze',
      [new BlockType(), new BlockType(), new BlockType(), new Side(), new UnitFloat(), new UnitFloat()],
      undefined,
    );
    const reflect = this.makeStandardDefinition('reflect', [new BlockType(), new Axis()], undefined);
    const translate = this.makeStandardDefinition(
      'translate',
      [new BlockType(), new Axis(), new PositiveInteger(), new PositiveFloat()],
      undefined,
    );
    const cuboid = this.makeStandardDefinition(
      'Cuboid',
      [new PositiveFloat(), new PositiveFloat(), new PositiveFloat(), new SapBoolean()],
      new BlockType(),
    );
    return [attach, squeeze, reflect, translate, cuboid];
  }

  public parseShapeAssemblyProgram(program: string): ShapeAssemblyProgram {
    const tokens = this.tokenizer.tokenize(program);
    const { statements, errors: statementErrors } = this.statementParser.parseStatements(tokens);
    const { result, errors: definitionErrors } = this.definitionParser.parseDefinitions(
      this.makeStandardDefinitions(),
      statements,
    );
    return {
      definitions: result,
      errors: [...statementErrors, ...definitionErrors],
    };
  }
}
