export class SlidingCounter {
  private buckets = new Map<number, number>();
  constructor(private windowMs: number, private bucketMs: number) {}

  add(n = 1, at = Date.now()) {
    const key = Math.floor(at / this.bucketMs) * this.bucketMs;
    this.buckets.set(key, (this.buckets.get(key) ?? 0) + n);
    this.prune(at);
  }

  count(now = Date.now()) {
    this.prune(now);
    let sum = 0;
    for (const [_, v] of this.buckets) sum += v;
    return sum;
  }

  private prune(now: number) {
    const minKey = now - this.windowMs;
    for (const k of this.buckets.keys()) if (k < minKey) this.buckets.delete(k);
  }
}

export class SlidingDistinct {
  private buckets = new Map<number, Set<string>>();
  constructor(private windowMs: number, private bucketMs: number) {}

  add(value: string, at = Date.now()) {
    const key = Math.floor(at / this.bucketMs) * this.bucketMs;
    if (!this.buckets.has(key)) this.buckets.set(key, new Set());
    this.buckets.get(key)!.add(value);
    this.prune(at);
  }

  distinctCount(now = Date.now()) {
    this.prune(now);
    const set = new Set<string>();
    for (const s of this.buckets.values()) for (const v of s) set.add(v);
    return set.size;
  }

  private prune(now: number) {
    const minKey = now - this.windowMs;
    for (const k of this.buckets.keys()) if (k < minKey) this.buckets.delete(k);
  }
}
