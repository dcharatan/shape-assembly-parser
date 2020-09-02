import { operatorSymbols } from '../operator/operators';

const separators = new Set([...[',', '(', ')', '=', ':', '\n'], ...Array.from(operatorSymbols)]);
export default separators;
