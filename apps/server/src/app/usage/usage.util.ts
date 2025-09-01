import { PathRule } from './usage.types';

export function normalizePath(path: string): string {
  // strip trailing slash (except root), remove query if present
  const p = path.split('?')[0].replace(/\/$/, '') || '/';
  return p;
}

export function matchRule(path: string, rules: Record<string, PathRule> = {}): PathRule | undefined {
  // Prefer exact match, then longest prefix match
  if (rules[path]) return rules[path];
  let best: { len: number; rule: PathRule } | undefined;
  for (const [prefix, rule] of Object.entries(rules)) {
    if (prefix !== '/' && path.startsWith(prefix)) {
      if (!best || prefix.length > best.len) best = { len: prefix.length, rule };
    }
  }
  return best?.rule;
}

export function nowMinuteWindow(ts = Date.now()): number {
  return ts - (ts % 60000);
}

export function todayStr(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

