import SapErrorWithToken from './SapErrorWithToken';

export default class ReturnTypeError extends SapErrorWithToken {
  public get message(): string {
    return `ReturnTypeError: User-defined functions may only return tuples of cuboids.`;
  }
}
