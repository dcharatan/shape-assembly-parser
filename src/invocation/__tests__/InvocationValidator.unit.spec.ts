import InvocationValidator from '../InvocationValidator';
import Token from '../../token/Token';
import Invocation from '../Invocation';
import Definition from '../../definition/Definition';
import Declaration from '../../definition/Declaration';
import PositiveInteger from '../../type/PositiveInteger';
import ExpressionNode from '../../expression/ExpressionNode';
import SapError from '../../error/SapError';
import PositiveFloat from '../../type/PositiveFloat';
import BlockType from '../../type/BlockType';
import SapType from '../../type/SapType';
import SapBoolean from '../../type/SapBoolean';
import ReturnStatement from '../ReturnStatement';

const makeToken = (text: string) => new Token(text, 0, 1);
const makeExpression = (text: string) => new ExpressionNode(makeToken(text), []);

describe('InvocationValidator Unit Tests', () => {
  let validator: InvocationValidator;
  let existingDefinition: Definition;
  let existingDefinition2: Definition;
  let existingDefinition3: Definition;
  let cuboidDefinition: Definition;

  beforeEach(() => {
    validator = new InvocationValidator();
    existingDefinition = new Definition(
      new Declaration(makeToken('eat_celery'), [makeToken('num_sticks')]),
      [],
      [new PositiveInteger()],
      false,
      false,
      false,
      undefined,
    );
    existingDefinition2 = new Definition(
      new Declaration(makeToken('cook_celery'), [makeToken('num_sticks'), makeToken('how_long')]),
      [],
      [new PositiveInteger(), new PositiveFloat()],
      false,
      false,
      false,
      new BlockType(),
      new ReturnStatement([makeToken('celery_retval')], makeToken('return')),
    );
    existingDefinition3 = new Definition(
      new Declaration(makeToken('eat_celery'), [makeToken('with_toppings')]),
      [],
      [new SapBoolean()],
      false,
      false,
      false,
      undefined,
    );
    cuboidDefinition = new Definition(
      new Declaration(makeToken('Cuboid'), [makeToken('x'), makeToken('y'), makeToken('z'), makeToken('a')]),
      [],
      [new PositiveFloat(), new PositiveFloat(), new PositiveFloat(), new SapBoolean()],
      true,
      false,
      false,
      new BlockType(),
    );
  });

  describe('validateInvocation', () => {
    test('correct parsing for invocation with single argument', () => {
      const invocation = new Invocation(makeToken('eat_celery'), [makeExpression('5')], []);
      expect(validator.validateInvocation(invocation, [cuboidDefinition, existingDefinition], new Map())).toBeUndefined();
    });

    test('correct parsing for invocation with assignment', () => {
      const invocation = new Invocation(
        makeToken('cook_celery'),
        [makeExpression('5'), makeExpression('5')],
        [makeToken('assignment_var')],
      );
      expect(validator.validateInvocation(invocation, [cuboidDefinition, existingDefinition2], new Map())).toBeUndefined();
    });

    test('correct parsing for invocation with expression tree', () => {
      const expression = new ExpressionNode(makeToken('*'), [makeExpression('5'), makeExpression('5')]);
      const invocation = new Invocation(makeToken('eat_celery'), [expression], []);
      expect(validator.validateInvocation(invocation, [cuboidDefinition, existingDefinition], new Map())).toBeUndefined();
    });

    test('correct parsing for invocation with matching variable with unknown type', () => {
      const functionLocalTypes = new Map<string, SapType<unknown> | null>();
      functionLocalTypes.set('arg_1', null);
      const invocation = new Invocation(
        makeToken('cook_celery'),
        [makeExpression('5'), makeExpression('arg_1')],
        [makeToken('assignment_var')],
      );
      expect(validator.validateInvocation(invocation, [cuboidDefinition, existingDefinition2], functionLocalTypes)).toBeUndefined();
      expect(functionLocalTypes.get('arg_1')).toBeInstanceOf(PositiveFloat);
    });

    test('correct parsing for invocation with matching variable with matching type', () => {
      const functionLocalTypes = new Map<string, SapType<unknown> | null>();
      functionLocalTypes.set('arg_1', new PositiveFloat());
      const invocation = new Invocation(
        makeToken('cook_celery'),
        [makeExpression('5'), makeExpression('arg_1')],
        [makeToken('assignment_var')],
      );
      expect(validator.validateInvocation(invocation, [cuboidDefinition, existingDefinition2], functionLocalTypes)).toBeUndefined();
      expect(functionLocalTypes.get('arg_1')).toBeInstanceOf(PositiveFloat);
    });

    describe('error checking', () => {
      test('too few arguments', () => {
        const invocation = new Invocation(makeToken('eat_celery'), [], []);
        expect(validator.validateInvocation(invocation, [cuboidDefinition, existingDefinition], new Map())).toBeInstanceOf(SapError);
      });

      test('too many arguments', () => {
        const invocation = new Invocation(makeToken('eat_celery'), [makeExpression('5'), makeExpression('5')], []);
        expect(validator.validateInvocation(invocation, [cuboidDefinition, existingDefinition], new Map())).toBeInstanceOf(SapError);
      });

      test('undefined function', () => {
        const invocation = new Invocation(makeToken('yeet_celery'), [makeExpression('5')], []);
        expect(validator.validateInvocation(invocation, [cuboidDefinition, existingDefinition], new Map())).toBeInstanceOf(SapError);
      });

      test('unexpected assignment', () => {
        const invocation = new Invocation(
          makeToken('eat_celery'),
          [makeExpression('5')],
          [makeToken('assignment_var')],
        );
        expect(validator.validateInvocation(invocation, [cuboidDefinition, existingDefinition], new Map())).toBeInstanceOf(SapError);
      });

      test('assignment name collision with existing definition', () => {
        const invocation = new Invocation(
          makeToken('cook_celery'),
          [makeExpression('5'), makeExpression('5')],
          [makeToken('eat_celery')],
        );
        expect(
          validator.validateInvocation(invocation, [cuboidDefinition, existingDefinition, existingDefinition2], new Map()),
        ).toBeInstanceOf(SapError);
      });

      test('assignment name collision with existing definition', () => {
        const functionLocalTypes = new Map<string, SapType<unknown> | null>();
        functionLocalTypes.set('existing_var', null);
        const invocation = new Invocation(
          makeToken('cook_celery'),
          [makeExpression('5'), makeExpression('5')],
          [makeToken('existing_var')],
        );
        expect(
          validator.validateInvocation(invocation, [cuboidDefinition, existingDefinition, existingDefinition2], functionLocalTypes),
        ).toBeInstanceOf(SapError);
      });

      test('expression token is not existing var', () => {
        const invocation = new Invocation(
          makeToken('cook_celery'),
          [makeExpression('bad_var'), makeExpression('5')],
          [makeToken('assignment_var')],
        );
        expect(
          validator.validateInvocation(invocation, [cuboidDefinition, existingDefinition, existingDefinition2], new Map()),
        ).toBeInstanceOf(SapError);
      });

      test('expression token has mismatched type', () => {
        const functionLocalTypes = new Map<string, SapType<unknown> | null>();
        functionLocalTypes.set('arg_1', new PositiveInteger());
        const invocation = new Invocation(
          makeToken('cook_celery'),
          [makeExpression('5'), makeExpression('arg_1')],
          [makeToken('assignment_var')],
        );
        expect(validator.validateInvocation(invocation, [cuboidDefinition, existingDefinition2], functionLocalTypes)).toBeInstanceOf(
          SapError,
        );
      });

      test('expression token cannot be parsed', () => {
        const invocation = new Invocation(makeToken('eat_celery'), [makeExpression('True')], []);
        expect(validator.validateInvocation(invocation, [cuboidDefinition, existingDefinition], new Map())).toBeInstanceOf(SapError);
      });

      test('invalid operator for operands', () => {
        const expression = new ExpressionNode(makeToken('*'), [makeExpression('True'), makeExpression('True')]);
        const invocation = new Invocation(makeToken('eat_celery'), [expression], []);
        expect(validator.validateInvocation(invocation, [cuboidDefinition, existingDefinition3], new Map())).toBeInstanceOf(SapError);
      });
    });
  });
});
