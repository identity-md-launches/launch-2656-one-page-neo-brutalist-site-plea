export const RULES = Object.freeze({ judges: 30, quorum: 17, maxScore: 45, maxFact: 41, baseNeed: 69, maxSale: 2_500_000, demoBag: 10_000_000, maxShare: 50 });
export type Position = 'loss' | 'breakeven' | 'profit';
export type Trend = 'down' | 'flat' | 'up';
export type Inputs = { amount: number; days: number; position: Position; profit: number; trend: Trend };
export type Facts = { share: number; held: number; pnl: number; trend: number; total: number; need: number; percent: number };

export function getFacts(input: Inputs): Facts {
  const percent = input.amount / RULES.demoBag * 100;
  const share = percent <= 20 ? 16 : percent <= 35 ? 9 : 3;
  const held = input.days >= 7 ? 3 : input.days >= 3 ? 2 : input.days >= 1 ? 1 : 0;
  const gain = input.position === 'breakeven' ? 0 : input.profit;
  const pnl = input.position === 'loss' ? 13 : gain <= 50 ? 12 : gain <= 200 ? 10 : gain <= 500 ? 8 : gain <= 1000 ? 6 : 4;
  const trend = input.trend === 'up' ? 9 : input.trend === 'flat' ? 5 : 0;
  const total = share + held + pnl + trend;
  return { share, held, pnl, trend, total, need: RULES.baseNeed - total, percent };
}

export function inspectPlea(value: string) {
  const bytes = new TextEncoder().encode(value).length;
  const oneLine = !/[\r\n\u2028\u2029]/u.test(value);
  // C0/C1 controls, nonprinting format characters, BOM and blank Unicode separators.
  const hidden = /[\p{Cc}\p{Cf}\u00a0\u034f\u115f\u1160\u17b4\u17b5\u3164\uffa0]/u.test(value);
  const manipulation = /give\s+me\s+50/i.test(value.normalize('NFKC'));
  return { bytes, oneLine, hidden, manipulation, valid: value.trim().length > 0 && bytes <= 280 && oneLine && !hidden };
}

export type DemoScenario = 'normal' | 'split';
export function makeScores(text: string, scenario: DemoScenario = 'normal'): number[] {
  if (inspectPlea(text).manipulation) return Array<number>(RULES.judges).fill(0);
  // Deliberately illustrative, deterministic scores. This does not evaluate persuasion or AI.
  if (scenario === 'split') return Array.from({ length: RULES.judges }, (_, i) => i % 2 ? 0 : 45);
  const seed = [...text].reduce((total, char) => (total * 31 + (char.codePointAt(0) || 0)) >>> 0, 7);
  const center = 34 + seed % 8;
  const offsets = [-3, 1, -1, 4, -2, 2, 0, 3, -4, 1, -2, 3, 0, -1, 4, 2, -3, 1, 0, 2, -1, 3, -2, 0, 4, 1, -3, 2, 0, -1];
  return offsets.map(offset => Math.min(45, Math.max(0, center + offset)));
}

export function getVerdict(scores: number[], need: number) {
  const yes = scores.filter(score => score >= need).length;
  const no = scores.length - yes;
  const average = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const status = yes >= RULES.quorum ? 'granted' : no >= RULES.quorum ? 'denied' : 'hung';
  return { status, yes, no, average } as const;
}

export function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  return [Math.floor(safe / 3600), Math.floor(safe % 3600 / 60), safe % 60].map(n => String(n).padStart(2, '0')).join(':');
}
