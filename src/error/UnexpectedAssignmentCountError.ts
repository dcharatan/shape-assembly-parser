import SapErrorWithToken from './SapErrorWithToken';
import Token from '../token/Token';

export default class UnexpectedAssignmentCountError extends SapErrorWithToken {
  constructor(token: Token, private expectedNumberOfAssignments: number, private receivedNumberOfAssignments: number) {
    super(token);
  }

  public get message(): string {
    return `UnexpectedAssignmentCountError: Expected ${this.expectedNumberOfAssignments} but received ${this.receivedNumberOfAssignments} assignments.`;
  }
}
