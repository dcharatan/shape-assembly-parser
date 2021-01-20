export default class MappedSet<K, V> {
  private map = new Map<K, Set<V>>();

  public get(key: K): Set<V> {
    return this.map.get(key) ?? new Set();
  }

  public add(key: K, ...values: V[]): void {
    if (!this.map.has(key)) {
      this.map.set(key, new Set());
    }
    values.forEach((value) => this.map.get(key)?.add(value));
  }
}
