// 시드 가능한 난수 (리플레이/디버그/일일 도전 모드에 활용 가능)
export class Rng {
  private s: number;
  constructor(seed = Date.now()) { this.s = seed >>> 0; }
  next(): number {
    let t = (this.s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(min: number, max: number): number { return Math.floor(this.next() * (max - min + 1)) + min; }
  pick<T>(arr: T[]): T { return arr[Math.floor(this.next() * arr.length)]; }
  weighted<K extends string>(w: Record<K, number>): K {
    const entries = Object.entries(w) as [K, number][];
    let r = this.next() * entries.reduce((s, [, v]) => s + v, 0);
    for (const [k, v] of entries) { if ((r -= v) < 0) return k; }
    return entries[entries.length - 1][0];
  }
}

export const rng = new Rng();
let uidCounter = 0;
export const uid = () => `c${Date.now().toString(36)}${(uidCounter++).toString(36)}`;
