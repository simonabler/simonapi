export interface PathRule {
  perMinute?: number; // max requests per key per minute
  perDay?: number; // max requests per key per day
}

export interface UsageModuleOptions {
  defaultRule?: PathRule;
  pathRules?: Record<string, PathRule>; // key is path prefix (e.g., "/utils") or exact path
  adminToken?: string; // token for stats endpoint
  identifyBy?: 'apiKey' | 'ip' | 'both';
}

export interface TallyKey {
  key: string; // apiKey or ip
  path: string; // normalized path
}

export interface MinuteBucket {
  windowStart: number; // epoch ms aligned to minute
  count: number;
}

export interface DayBucket {
  day: string; // YYYY-MM-DD
  count: number;
}

export interface RouteStats {
  hits: number;
  ok: number;
  errors: number;
  totalLatencyMs: number;
  maxLatencyMs: number;
}

export interface UsageSnapshot {
  since: string;
  totals: {
    hits: number;
    ok: number;
    errors: number;
    uniqueKeys: number;
  };
  perRoute: Record<string, RouteStats>;
  rules: { defaultRule?: PathRule; pathRules?: Record<string, PathRule> };
}

