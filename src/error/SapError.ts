export default abstract class SapError {
  abstract get message(): string;
  abstract get start(): number;
  abstract get end(): number;
}
