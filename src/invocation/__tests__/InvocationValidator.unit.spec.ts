import InvocationValidator from '../InvocationValidator';
import Token from '../../token/Token';
import Invocation from '../Invocation';
import Definition from '../../definition/Definition';
import Declaration from '../../definition/Declaration';
import PositiveInteger from '../../type/PositiveInteger';
import BlockType from '../../type/BlockType';
import AlreadyDeclaredError from '../../error/AlreadyDeclaredError';
import ArgumentMismatchError from '../../error/ArgumentMismatchError';
import SapTypeError from '../../error/SapTypeError';
import UnexpectedAssignmentError from '../../error/UnexpectedAssignmentError';
import InvocationError from '../../error/InvocationError';
import ExpressionNode from '../../expression/ExpressionNode';

const makeToken = (text: string) => new Token(text, 0, 1);

describe('InvocationValidator Unit Tests', () => {
  let validator: InvocationValidator;

  beforeEach(() => {
    validator = new InvocationValidator();
  });

  describe('validateInvocation', () => {
    test('correct parsing for invocation with single argument', () => {
      const invocation = new Invocation(makeToken('eat_celery'), [new ExpressionNode(makeToken('5'), [])], undefined);
      const definition = new Definition(
        new Declaration(makeToken('eat_celery'), [makeToken('num_sticks')]),
        [],
        [new PositiveInteger()],
        undefined,
      );
      expect(validator.validateInvocation(invocation, [definition], [])).toBeUndefined();
    });

    test('correct parsing for invocation assignment and no arguments', () => {
      const invocation = new Invocation(makeToken('eat_celery'), [], makeToken('eat_celery_result'));
      const definition = new Definition(
        new Declaration(makeToken('eat_celery'), [makeToken('num_sticks')]),
        [],
        [],
        new BlockType(),
      );
      expect(validator.validateInvocation(invocation, [definition], [])).toBeUndefined();
    });

    test('correct parsing for multiple invocations without arguments', () => {
      const previousInvocation = new Invocation(makeToken('prepare_celery'), [], undefined);
      const previousDefinition = new Definition(new Declaration(makeToken('prepare_celery'), []), [], [], undefined);
      const invocation = new Invocation(makeToken('eat_celery'), [], makeToken('eat_celery_result_2'));
      const definition = new Definition(new Declaration(makeToken('eat_celery'), []), [], [], new BlockType());
      expect(
        validator.validateInvocation(invocation, [previousDefinition, definition], [previousInvocation]),
      ).toBeUndefined();
    });

    test('invoking undefined function gives error', () => {
      const invocation = new Invocation(makeToken('eat_celery'), [new ExpressionNode(makeToken('5'), [])], undefined);
      expect(validator.validateInvocation(invocation, [], [])).toBeInstanceOf(InvocationError);
    });

    test('assigning void return type gives error', () => {
      const invocation = new Invocation(makeToken('eat_celery'), [new ExpressionNode(makeToken('5'), [])], makeToken('result'));
      const definition = new Definition(
        new Declaration(makeToken('eat_celery'), [makeToken('num_sticks')]),
        [],
        [new PositiveInteger()],
        undefined,
      );
      expect(validator.validateInvocation(invocation, [definition], [])).toBeInstanceOf(UnexpectedAssignmentError);
    });

    test('duplicate assignment gives error', () => {
      const previousInvocation = new Invocation(makeToken('eat_celery'), [new ExpressionNode(makeToken('5'), [])], makeToken('result'));
      const invocation = new Invocation(makeToken('eat_celery'), [new ExpressionNode(makeToken('5'), [])], makeToken('result'));
      const definition = new Definition(
        new Declaration(makeToken('eat_celery'), [makeToken('num_sticks')]),
        [],
        [new PositiveInteger()],
        new BlockType(),
      );
      expect(validator.validateInvocation(invocation, [definition], [previousInvocation])).toBeInstanceOf(
        AlreadyDeclaredError,
      );
    });

    test('argument count mismatch gives error', () => {
      const invocation = new Invocation(makeToken('eat_celery'), [new ExpressionNode(makeToken('5'), []), new ExpressionNode(makeToken('6'), [])], undefined);
      const definition = new Definition(
        new Declaration(makeToken('eat_celery'), [makeToken('num_sticks')]),
        [],
        [new PositiveInteger()],
        undefined,
      );
      expect(validator.validateInvocation(invocation, [definition], [])).toBeInstanceOf(ArgumentMismatchError);
    });

    test('argument type mismatch gives error', () => {
      const invocation = new Invocation(makeToken('eat_celery'), [new ExpressionNode(makeToken('not_an_integer'), [])], undefined);
      const definition = new Definition(
        new Declaration(makeToken('eat_celery'), [makeToken('num_sticks')]),
        [],
        [new PositiveInteger()],
        undefined,
      );
      expect(validator.validateInvocation(invocation, [definition], [])).toBeInstanceOf(SapTypeError);
    });
  });
});
