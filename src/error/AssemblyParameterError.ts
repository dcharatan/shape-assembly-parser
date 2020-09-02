import SapErrorWithToken from './SapErrorWithToken';
import Token from '../token/Token';

export default class AssemblyParameterError extends SapErrorWithToken {
  constructor(token: Token, private forRootAssembly: boolean) {
    super(token);
  }

  public get message(): string {
    return `AssemblyParameterError: ${this.forRootAssembly ? 'Root' : 'Child'} assembly requires ${this.forRootAssembly ? 'zero arguments' : 'one argument'}.`;
  }
}
