import { ITEM_RARITIES, type ItemRarity } from "./rarity-zone-rewards";

export interface DurationRarityThresholds {
  readonly Common: number;
  readonly Uncommon: number;
  readonly Rare: number;
  readonly Epic: number;
  readonly Legend: number;
  readonly Mythic: number;
}

export interface DurationRarityDistributionInput {
  readonly degreesOfFreedom: number;
  readonly thresholds: DurationRarityThresholds;
  readonly reachableRarities?: readonly ItemRarity[];
}

export interface RarityOpportunityMetrics {
  readonly probabilityByRarity: Readonly<Record<ItemRarity, number>>;
  readonly rareOrBetterProbability: number;
  readonly epicOrBetterProbability: number;
  readonly legendOrBetterProbability: number;
  readonly mythicOrBetterProbability: number;
  readonly phantasmProbability: number;
  readonly expectedRarityScore: number;
}

/**
 * Initial Medium (df=6) calibration thresholds for the reference distribution:
 * Common 55%, Uncommon 25%, Rare 12%, Epic 5%, Legend 2%, Mythic 0.8%, Phantasm 0.2%.
 * These are simulation defaults, not production commitments.
 */
export const INITIAL_MEDIUM_T_THRESHOLDS: DurationRarityThresholds = {
  Common: 0.13107565311572658,
  Uncommon: 0.9057032851805317,
  Rare: 1.6032512567041988,
  Epic: 2.313263299812739,
  Legend: 3.1426684032910064,
  Mythic: 4.524127925171067
};

export const INITIAL_DURATION_RARITY_DF = {
  short: 8,
  medium: 6,
  long: 5
} as const;

const RARITY_SCORE: Readonly<Record<ItemRarity, number>> = {
  Common: 0,
  Uncommon: 1,
  Rare: 2,
  Epic: 3,
  Legend: 4,
  Mythic: 5,
  Phantasm: 6
};

function logGamma(value: number): number {
  const coefficients = [
    676.5203681218851,
    -1259.1392167224028,
    771.3234287776531,
    -176.6150291621406,
    12.507343278686905,
    -0.13857109526572012,
    9.984369578019572e-6,
    1.5056327351493116e-7
  ];

  if (value < 0.5) {
    return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * value)) - logGamma(1 - value);
  }

  const z = value - 1;
  let x = 0.9999999999998099;
  for (let index = 0; index < coefficients.length; index += 1) {
    x += coefficients[index]! / (z + index + 1);
  }
  const t = z + coefficients.length - 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

function betaContinuedFraction(a: number, b: number, x: number): number {
  const maxIterations = 200;
  const epsilon = 3e-14;
  const fpMin = 1e-300;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;

  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < fpMin) d = fpMin;
  d = 1 / d;
  let h = d;

  for (let m = 1; m <= maxIterations; m += 1) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < fpMin) d = fpMin;
    c = 1 + aa / c;
    if (Math.abs(c) < fpMin) c = fpMin;
    d = 1 / d;
    h *= d * c;

    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < fpMin) d = fpMin;
    c = 1 + aa / c;
    if (Math.abs(c) < fpMin) c = fpMin;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < epsilon) break;
  }

  return h;
}

function regularizedIncompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  const logTerm =
    logGamma(a + b) -
    logGamma(a) -
    logGamma(b) +
    a * Math.log(x) +
    b * Math.log1p(-x);
  const front = Math.exp(logTerm);

  if (x < (a + 1) / (a + b + 2)) {
    return (front * betaContinuedFraction(a, b, x)) / a;
  }
  return 1 - (front * betaContinuedFraction(b, a, 1 - x)) / b;
}

export function studentTCdf(value: number, degreesOfFreedom: number): number {
  if (!Number.isFinite(value)) {
    if (value === Number.NEGATIVE_INFINITY) return 0;
    if (value === Number.POSITIVE_INFINITY) return 1;
    throw new RangeError("value must be finite or an infinity");
  }
  if (!Number.isFinite(degreesOfFreedom) || degreesOfFreedom <= 0) {
    throw new RangeError("degreesOfFreedom must be a positive finite number");
  }
  if (value === 0) return 0.5;

  const x = degreesOfFreedom / (degreesOfFreedom + value * value);
  const ibeta = regularizedIncompleteBeta(x, degreesOfFreedom / 2, 0.5);
  return value > 0 ? 1 - 0.5 * ibeta : 0.5 * ibeta;
}

function validateThresholds(thresholds: DurationRarityThresholds): void {
  const ordered = [
    thresholds.Common,
    thresholds.Uncommon,
    thresholds.Rare,
    thresholds.Epic,
    thresholds.Legend,
    thresholds.Mythic
  ];
  for (const threshold of ordered) {
    if (!Number.isFinite(threshold)) throw new RangeError("rarity thresholds must be finite");
  }
  for (let index = 1; index < ordered.length; index += 1) {
    if (ordered[index]! <= ordered[index - 1]!) {
      throw new RangeError("rarity thresholds must be strictly increasing");
    }
  }
}

export function buildDurationRarityDistribution(
  input: DurationRarityDistributionInput
): Readonly<Record<ItemRarity, number>> {
  validateThresholds(input.thresholds);
  if (!Number.isFinite(input.degreesOfFreedom) || input.degreesOfFreedom <= 0) {
    throw new RangeError("degreesOfFreedom must be a positive finite number");
  }

  const cumulative = [
    studentTCdf(input.thresholds.Common, input.degreesOfFreedom),
    studentTCdf(input.thresholds.Uncommon, input.degreesOfFreedom),
    studentTCdf(input.thresholds.Rare, input.degreesOfFreedom),
    studentTCdf(input.thresholds.Epic, input.degreesOfFreedom),
    studentTCdf(input.thresholds.Legend, input.degreesOfFreedom),
    studentTCdf(input.thresholds.Mythic, input.degreesOfFreedom)
  ];

  const raw: Record<ItemRarity, number> = {
    Common: cumulative[0]!,
    Uncommon: cumulative[1]! - cumulative[0]!,
    Rare: cumulative[2]! - cumulative[1]!,
    Epic: cumulative[3]! - cumulative[2]!,
    Legend: cumulative[4]! - cumulative[3]!,
    Mythic: cumulative[5]! - cumulative[4]!,
    Phantasm: 1 - cumulative[5]!
  };

  const reachable = input.reachableRarities
    ? new Set<ItemRarity>(input.reachableRarities)
    : new Set<ItemRarity>(ITEM_RARITIES);
  const totalReachable = ITEM_RARITIES.reduce(
    (sum, rarity) => sum + (reachable.has(rarity) ? raw[rarity] : 0),
    0
  );
  if (!(totalReachable > 0)) throw new RangeError("at least one rarity must be reachable");

  return Object.fromEntries(
    ITEM_RARITIES.map((rarity) => [
      rarity,
      reachable.has(rarity) ? raw[rarity] / totalReachable : 0
    ])
  ) as Record<ItemRarity, number>;
}

export function calculateRarityOpportunityMetrics(
  probabilityByRarity: Readonly<Record<ItemRarity, number>>
): RarityOpportunityMetrics {
  const sumFrom = (minimum: ItemRarity) => {
    const start = ITEM_RARITIES.indexOf(minimum);
    return ITEM_RARITIES.slice(start).reduce((sum, rarity) => sum + probabilityByRarity[rarity], 0);
  };

  return {
    probabilityByRarity,
    rareOrBetterProbability: sumFrom("Rare"),
    epicOrBetterProbability: sumFrom("Epic"),
    legendOrBetterProbability: sumFrom("Legend"),
    mythicOrBetterProbability: sumFrom("Mythic"),
    phantasmProbability: probabilityByRarity.Phantasm,
    expectedRarityScore: ITEM_RARITIES.reduce(
      (sum, rarity) => sum + probabilityByRarity[rarity] * RARITY_SCORE[rarity],
      0
    )
  };
}
