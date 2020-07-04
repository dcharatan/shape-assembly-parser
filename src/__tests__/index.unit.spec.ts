import ShapeAssemblyParser, { ShapeAssemblyProgram } from '../index';

describe('ShapeAssemblyParser Unit Tests', () => {
  let shapeAssemblyParser: ShapeAssemblyParser;

  beforeEach(() => {
    shapeAssemblyParser = new ShapeAssemblyParser();
  });

  describe('parseShapeAssemblyProgram', () => {
    describe('parsing for simple program', () => {
      let result: ShapeAssemblyProgram;

      beforeEach(() => {
        result = shapeAssemblyParser.parseShapeAssemblyProgram(`
def hello():
    cub1 = Cuboid(1,1,1,True)
    cub2 = Cuboid(1,1,1,True)
    attach(cub1, cub2, 1,1,1,1,1,1)
        `);
      });

      test('parsing gives no errors', () => {
        expect(result.errors).toHaveLength(0);
      });

      test('function is parsed', () => {
        expect(result.definitions.filter((d) => d.declaration.nameToken.text === 'hello')).toHaveLength(1);
      });

      test('function has three invocations', () => {
        const definition = result.definitions.find((d) => d.declaration.nameToken.text === 'hello');
        expect(definition && definition.invocations).toHaveLength(3);
      });
    });
  });
});
