import SapError from './SapError';

export default interface WithErrors<T> {
  result: T;
  errors: SapError[];
}
