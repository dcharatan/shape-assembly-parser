import DefinitionSplitter from '../DefinitionSplitter';
import Statement from '../../statement/Statement';
import Token from '../../token/Token';

const makeStatement = (tokens: string[]) =>
  new Statement(
    tokens.map((token) => new Token(token, 0, 1)),
    0,
  );

describe('DefinitionSplitter Unit Tests', () => {
  let splitter: DefinitionSplitter;

  beforeEach(() => {
    splitter = new DefinitionSplitter();
  });

  describe('splitIntoDefinitions', () => {
    test('multiple definitions are split correctly', () => {
      const statements = [
        ['def', 'zebra', '(', ')'],
        ['bird', '=', 'test', '(', ')'],
        ['def', 'porcupine', '(', 'hello', ')'],
        ['ant', '(', ')'],
      ].map(makeStatement);
      expect(splitter.splitIntoDefinitions(statements)).toEqual([statements.slice(0, 2), statements.slice(2, 4)]);
    });

    test('code without def at beginning parsed correctly', () => {
      const statements = [
        ['bird', '=', 'test', '(', ')'],
        ['def', 'porcupine', '(', 'hello', ')'],
        ['ant', '(', ')'],
      ].map(makeStatement);
      expect(splitter.splitIntoDefinitions(statements)).toEqual([statements.slice(0, 1), statements.slice(1, 3)]);
    });

    test('multiple defs in a row parsed correctly', () => {
      const statements = [
        ['def', 'zebra', '(', ')'],
        ['def', 'porcupine', '(', 'hello', ')'],
        ['ant', '(', ')'],
      ].map(makeStatement);
      expect(splitter.splitIntoDefinitions(statements)).toEqual([statements.slice(0, 1), statements.slice(1, 3)]);
    });

    test('annotations grouped with defs', () => {
      const statements = [
        ['@assembly'],
        ['def', 'zebra', '(', ')'],
        ['@assembly'],
        ['@root_assembly'],
        ['def', 'porcupine', '(', 'hello', ')'],
        ['ant', '(', ')'],
      ].map(makeStatement);
      expect(splitter.splitIntoDefinitions(statements)).toEqual([statements.slice(0, 2), statements.slice(2, 3), statements.slice(3, 6)]);
    });
  });
});
