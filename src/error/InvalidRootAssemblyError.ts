import SapErrorWithToken from './SapErrorWithToken';
import Token from '../token/Token';

export default class InvalidRootAssemblyError extends SapErrorWithToken {
  constructor(token: Token) {
    super(token);
  }

  public get message(): string {
    return `InvalidRootAssemblyError: The root assembly must define a bounding box (a cuboid declared under the name "bbox").`;
  }
}
