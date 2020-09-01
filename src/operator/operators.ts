import Operator from './Operator';

const createOperatorMap = (operators: Operator[]) => {
  const operatorMap = new Map<string, Operator>();
  for (const operator of operators) {
    operatorMap.set(operator.symbol, operator);
  }
  return operatorMap;
};

const operatorToSymbol = (operator: Operator) => operator.symbol;

export const binaryOperators: Operator[] = [
  new Operator('*', 1, false),
  new Operator('/', 1, false),
  new Operator('+', 0, false),
  new Operator('-', 0, false),
];
export const unaryOperators: Operator[] = [new Operator('+', 2, true), new Operator('-', 2, true)];
export const binaryOperatorSymbolsToOperators = createOperatorMap(binaryOperators);
export const unaryOperatorSymbolsToOperators = createOperatorMap(unaryOperators);
export const operatorSymbols = new Set([
  ...binaryOperators.map(operatorToSymbol),
  ...unaryOperators.map(operatorToSymbol),
]);
